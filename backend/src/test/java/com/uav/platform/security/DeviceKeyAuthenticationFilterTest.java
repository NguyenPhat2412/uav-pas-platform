package com.uav.platform.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.uav.platform.dto.record.devicekey.DevicePrincipal;
import com.uav.platform.service.devicekey.DeviceKeyService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

@DisplayName("DeviceKeyAuthenticationFilter Security Unit Tests")
class DeviceKeyAuthenticationFilterTest {

    @AfterEach
    void cleanupContext() {
        SecurityContextHolder.clearContext();
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<DeviceKeyService> providerOf(DeviceKeyService service) {
        ObjectProvider<DeviceKeyService> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(service);
        return provider;
    }

    @Test
    @DisplayName("Passes through untouched when X-Device-Key header is absent")
    void noDeviceKeyHeader_passesThrough() throws Exception {
        DeviceKeyService service = mock(DeviceKeyService.class);
        DeviceKeyAuthenticationFilter filter =
                new DeviceKeyAuthenticationFilter(providerOf(service));
        FilterChain chain = mock(FilterChain.class);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/uavs");
        MockHttpServletResponse response = new MockHttpServletResponse();

        assertFalse(DeviceKeyAuthenticationFilter.isDeviceRequest(request));
        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        verifyNoInteractions(service);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("Rejects with 401 when Authorization header is combined with X-Device-Key")
    void combinedWithAuthorizationHeader_rejects401() throws Exception {
        DeviceKeyService service = mock(DeviceKeyService.class);
        DeviceKeyAuthenticationFilter filter =
                new DeviceKeyAuthenticationFilter(providerOf(service));
        FilterChain chain = mock(FilterChain.class);

        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/api/v1/uavs/42/telemetry");
        request.addHeader(DeviceKeyAuthenticationFilter.HEADER, "dk_live_secret");
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer user-jwt");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertEquals(401, response.getStatus());
        assertEquals("no-store", response.getHeader(HttpHeaders.CACHE_CONTROL));
        assertTrue(response.getContentAsString().contains("DEVICE_KEY_INVALID"));
        verifyNoInteractions(chain);
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("Rejects with 401 when multiple X-Device-Key headers are sent")
    void multipleDeviceKeyHeaders_rejects401() throws Exception {
        DeviceKeyService service = mock(DeviceKeyService.class);
        DeviceKeyAuthenticationFilter filter =
                new DeviceKeyAuthenticationFilter(providerOf(service));
        FilterChain chain = mock(FilterChain.class);

        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/api/v1/uavs/42/telemetry");
        request.addHeader(DeviceKeyAuthenticationFilter.HEADER, "dk_1");
        request.addHeader(DeviceKeyAuthenticationFilter.HEADER, "dk_2");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("DEVICE_KEY_INVALID"));
        verifyNoInteractions(chain);
        verifyNoInteractions(service);
    }

    @Test
    @DisplayName("Rejects with 401 when device key is unknown, revoked, or service is unavailable")
    void invalidOrUnavailableKey_rejects401() throws Exception {
        DeviceKeyService service = mock(DeviceKeyService.class);
        when(service.authenticate("dk_bad")).thenReturn(Optional.empty());
        DeviceKeyAuthenticationFilter filter =
                new DeviceKeyAuthenticationFilter(providerOf(service));
        FilterChain chain = mock(FilterChain.class);

        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/api/v1/uavs/42/telemetry");
        request.addHeader(DeviceKeyAuthenticationFilter.HEADER, " dk_bad ");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, chain);

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("DEVICE_KEY_INVALID"));
        verifyNoInteractions(chain);

        // Also reject when DeviceKeyService bean is unavailable
        DeviceKeyAuthenticationFilter unavailableFilter =
                new DeviceKeyAuthenticationFilter(providerOf(null));
        MockHttpServletResponse unavailableResponse = new MockHttpServletResponse();
        unavailableFilter.doFilter(request, unavailableResponse, chain);
        assertEquals(401, unavailableResponse.getStatus());
    }

    @Test
    @DisplayName(
            "Rejects with 403 for non-telemetry endpoint, non-POST method, wrong scope, or mismatched UAV")
    void scopeAndRouteRestrictions_reject403() throws Exception {
        DeviceKeyService service = mock(DeviceKeyService.class);
        DevicePrincipal boundPrincipal =
                new DevicePrincipal(1L, "uav42", 42L, Set.of("TELEMETRY_WRITE"));
        DevicePrincipal readOnlyPrincipal =
                new DevicePrincipal(2L, "readonly", 42L, Set.of("TELEMETRY_READ"));
        when(service.authenticate("dk_uav42")).thenReturn(Optional.of(boundPrincipal));
        when(service.authenticate("dk_readonly")).thenReturn(Optional.of(readOnlyPrincipal));

        DeviceKeyAuthenticationFilter filter =
                new DeviceKeyAuthenticationFilter(providerOf(service));
        FilterChain chain = mock(FilterChain.class);

        // Wrong HTTP method
        MockHttpServletRequest getReq =
                new MockHttpServletRequest("GET", "/api/v1/uavs/42/telemetry");
        getReq.addHeader(DeviceKeyAuthenticationFilter.HEADER, "dk_uav42");
        MockHttpServletResponse getRes = new MockHttpServletResponse();
        filter.doFilter(getReq, getRes, chain);
        assertEquals(403, getRes.getStatus());
        assertTrue(getRes.getContentAsString().contains("DEVICE_KEY_FORBIDDEN"));

        // Wrong path (attempting to access admin or user endpoints with device key)
        MockHttpServletRequest adminReq = new MockHttpServletRequest("POST", "/api/v1/users");
        adminReq.addHeader(DeviceKeyAuthenticationFilter.HEADER, "dk_uav42");
        MockHttpServletResponse adminRes = new MockHttpServletResponse();
        filter.doFilter(adminReq, adminRes, chain);
        assertEquals(403, adminRes.getStatus());

        // Mismatched UAV ID (key bound to UAV 42 trying to push telemetry for UAV 99)
        MockHttpServletRequest wrongUavReq =
                new MockHttpServletRequest("POST", "/api/v1/uavs/99/telemetry");
        wrongUavReq.addHeader(DeviceKeyAuthenticationFilter.HEADER, "dk_uav42");
        MockHttpServletResponse wrongUavRes = new MockHttpServletResponse();
        filter.doFilter(wrongUavReq, wrongUavRes, chain);
        assertEquals(403, wrongUavRes.getStatus());

        // Missing TELEMETRY_WRITE scope
        MockHttpServletRequest missingScopeReq =
                new MockHttpServletRequest("POST", "/api/v1/uavs/42/telemetry");
        missingScopeReq.addHeader(DeviceKeyAuthenticationFilter.HEADER, "dk_readonly");
        MockHttpServletResponse missingScopeRes = new MockHttpServletResponse();
        filter.doFilter(missingScopeReq, missingScopeRes, chain);
        assertEquals(403, missingScopeRes.getStatus());

        verifyNoInteractions(chain);
    }

    @Test
    @DisplayName(
            "Valid device key authenticates with SCOPE_DEVICE_* authority, strips cookies, and clears context")
    void validDeviceKey_authenticatesAndStripsSessionCredentials() throws Exception {
        DeviceKeyService service = mock(DeviceKeyService.class);
        DevicePrincipal principal =
                new DevicePrincipal(10L, "kv260", null, Set.of("TELEMETRY_WRITE"));
        when(service.authenticate("dk_valid")).thenReturn(Optional.of(principal));

        DeviceKeyAuthenticationFilter filter =
                new DeviceKeyAuthenticationFilter(providerOf(service));

        MockHttpServletRequest request =
                new MockHttpServletRequest("POST", "/api/v1/uavs/77/telemetry");
        request.addHeader(DeviceKeyAuthenticationFilter.HEADER, "dk_valid");
        request.addHeader("Cookie", "uav_access_token=stolen-session");
        request.setCookies(new Cookie("uav_access_token", "stolen-session"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        AtomicReference<Authentication> capturedAuth = new AtomicReference<>();
        AtomicReference<HttpServletRequest> capturedReq = new AtomicReference<>();

        FilterChain chain =
                (req, res) -> {
                    capturedAuth.set(SecurityContextHolder.getContext().getAuthentication());
                    capturedReq.set((HttpServletRequest) req);
                };

        filter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        Authentication auth = capturedAuth.get();
        assertNotNull(auth);
        assertTrue(auth instanceof DeviceKeyAuthenticationToken);
        assertEquals("device:kv260", auth.getName());
        assertTrue(
                auth.getAuthorities().stream()
                        .anyMatch(a -> "SCOPE_DEVICE_TELEMETRY_WRITE".equals(a.getAuthority())));
        assertFalse(
                auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().startsWith("ROLE_")));

        // Cookies and Cookie/Authorization headers must be hidden from downstream filters
        HttpServletRequest wrapped = capturedReq.get();
        assertNotNull(wrapped);
        assertNull(wrapped.getCookies());
        assertNull(wrapped.getHeader("Cookie"));
        assertNull(wrapped.getHeader("Authorization"));
        assertFalse(wrapped.getHeaders("cookie").hasMoreElements());
        assertFalse(Collections.list(wrapped.getHeaderNames()).contains("Cookie"));
        assertEquals("dk_valid", wrapped.getHeader(DeviceKeyAuthenticationFilter.HEADER));

        // SecurityContext must be cleared after request completes
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("DeviceKeyAuthenticationToken forbids external setAuthenticated(true)")
    void deviceToken_rejectsExternalTrustMutation() {
        DeviceKeyAuthenticationToken token =
                new DeviceKeyAuthenticationToken(
                        new DevicePrincipal(1L, "k1", 1L, Set.of("TELEMETRY_WRITE")));
        assertTrue(token.isAuthenticated());
        assertNull(token.getCredentials());
        assertThrows(IllegalArgumentException.class, () -> token.setAuthenticated(true));
        token.setAuthenticated(false);
        assertFalse(token.isAuthenticated());
    }
}
