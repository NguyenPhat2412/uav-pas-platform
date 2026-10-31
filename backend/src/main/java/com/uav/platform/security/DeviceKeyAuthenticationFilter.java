package com.uav.platform.security;

import com.uav.platform.dto.record.devicekey.DevicePrincipal;
import com.uav.platform.service.devicekey.DeviceKeyService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Authenticates telemetry devices by the {@code X-Device-Key} header.
 *
 * <p>A request carrying the header is a device request and nothing else: it must not also carry
 * an Authorization header, its cookies are hidden from later filters (so a browser session can
 * never be combined with it), and it may only reach {@code POST /api/v1/uavs/{id}/telemetry} for
 * the key's own UAV. An unknown, revoked or expired key gets the same bare 401.
 */
public class DeviceKeyAuthenticationFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-Device-Key";
    private static final Pattern TELEMETRY =
            Pattern.compile("^/api/v1/uavs/([1-9][0-9]{0,17})/telemetry$");

    private final ObjectProvider<DeviceKeyService> deviceKeys;

    public DeviceKeyAuthenticationFilter(ObjectProvider<DeviceKeyService> deviceKeys) {
        this.deviceKeys = deviceKeys;
    }

    public static boolean isDeviceRequest(HttpServletRequest request) {
        return request.getHeader(HEADER) != null;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Enumeration<String> values = request.getHeaders(HEADER);
        if (values == null || !values.hasMoreElements()) {
            chain.doFilter(request, response);
            return;
        }
        List<String> keys = Collections.list(values);
        if (keys.size() != 1 || request.getHeader("Authorization") != null) {
            reject(response, HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        DeviceKeyService service = deviceKeys.getIfAvailable();
        Optional<DevicePrincipal> principal =
                service == null ? Optional.empty() : service.authenticate(keys.get(0).trim());
        if (principal.isEmpty()) {
            reject(response, HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        Matcher route = TELEMETRY.matcher(pathWithinApplication(request));
        if (!"POST".equals(request.getMethod()) || !route.matches()) {
            reject(response, HttpServletResponse.SC_FORBIDDEN);
            return;
        }
        Long uavId = Long.valueOf(route.group(1));
        DevicePrincipal device = principal.get();
        if (!device.scopes().contains("TELEMETRY_WRITE")
                || (device.uavId() != null && !device.uavId().equals(uavId))) {
            reject(response, HttpServletResponse.SC_FORBIDDEN);
            return;
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new DeviceKeyAuthenticationToken(device));
        SecurityContextHolder.setContext(context);
        try {
            chain.doFilter(new DeviceOnlyRequest(request), response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private static String pathWithinApplication(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String context = request.getContextPath();
        if (context != null && !context.isEmpty() && uri.startsWith(context))
            uri = uri.substring(context.length());
        return uri;
    }

    private static void reject(HttpServletResponse response, int status) throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Cache-Control", "no-store");
        String error = status == HttpServletResponse.SC_UNAUTHORIZED ? "Unauthorized" : "Forbidden";
        String code =
                status == HttpServletResponse.SC_UNAUTHORIZED
                        ? "DEVICE_KEY_INVALID"
                        : "DEVICE_KEY_FORBIDDEN";
        response.getWriter()
                .write(
                        "{\"status\":"
                                + status
                                + ",\"error\":\""
                                + error
                                + "\",\"code\":\""
                                + code
                                + "\"}");
    }

    /** Hides session credentials so no later filter can authenticate the request as a user. */
    private static final class DeviceOnlyRequest extends HttpServletRequestWrapper {
        DeviceOnlyRequest(HttpServletRequest request) {
            super(request);
        }

        @Override
        public Cookie[] getCookies() {
            return null;
        }

        @Override
        public String getHeader(String name) {
            return hidden(name) ? null : super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            return hidden(name) ? Collections.emptyEnumeration() : super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            return Collections.enumeration(
                    Collections.list(super.getHeaderNames()).stream()
                            .filter(name -> !hidden(name))
                            .toList());
        }

        private static boolean hidden(String name) {
            return "cookie".equalsIgnoreCase(name) || "authorization".equalsIgnoreCase(name);
        }
    }
}
