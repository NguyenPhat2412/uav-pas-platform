package com.uav.platform.websocket;

import com.uav.platform.dto.record.realtime.RealtimeSessionPrincipal;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.support.SupportThreadRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.permission.PermissionService;

import jakarta.servlet.http.HttpServletRequest;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Authenticates WebSocket upgrades via either an active JWT session (Admin / Customer) or a
 * verified SupportThread visitorToken. Unauthenticated idle sockets without a valid token are
 * rejected at the HTTP handshake boundary.
 */
@Component
@RequiredArgsConstructor
public class RealtimeHandshakeInterceptor implements HandshakeInterceptor {

    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final SupportThreadRepository supportThreadRepository;

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        Long userId = null;
        String username = null;
        boolean canAdminSupport = false;
        boolean canManageBilling = false;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null && request.getPrincipal() instanceof Authentication principalAuth) {
            auth = principalAuth;
        }
        if (auth != null
                && auth.isAuthenticated()
                && !"anonymousUser".equals(auth.getName())
                && auth.getName() != null
                && !auth.getName().isBlank()) {
            AppUser user = userRepository.findByUsername(auth.getName()).orElse(null);
            if (user != null && user.getStatus() == UserStatus.ACTIVE && !user.isManualLocked()) {
                userId = user.getId();
                username = user.getUsername();
                // Staff-only: customers hold DASHBOARD_VIEW too, and admin frames carry every
                // visitor's messages.
                canAdminSupport = permissionService.has(auth, "SUPPORT_MANAGE");
                canManageBilling = permissionService.has(auth, "USER_MANAGE");
            }
        }

        String validatedVisitorToken = null;
        if (request instanceof ServletServerHttpRequest servletRequest) {
            HttpServletRequest raw = servletRequest.getServletRequest();
            String tokenParam = raw.getParameter("visitorToken");
            if (tokenParam != null && !tokenParam.isBlank()) {
                String trimmed = tokenParam.trim();
                if (trimmed.length() <= 64
                        && supportThreadRepository.findByVisitorToken(trimmed).isPresent()) {
                    validatedVisitorToken = trimmed;
                }
            }
        }

        if (userId == null && validatedVisitorToken == null) {
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        attributes.put(
                RealtimeSessionPrincipal.ATTRIBUTE_KEY,
                new RealtimeSessionPrincipal(
                        userId,
                        username,
                        canAdminSupport,
                        canManageBilling,
                        validatedVisitorToken));
        return true;
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
        // No post-handshake mutation needed.
    }
}
