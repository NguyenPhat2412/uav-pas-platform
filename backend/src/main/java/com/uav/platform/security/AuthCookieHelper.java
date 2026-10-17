package com.uav.platform.security;

import com.uav.platform.common.dto.response.MessageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.dto.request.LogoutRequest;
import com.uav.platform.modules.auth.dto.request.RefreshTokenRequest;
import com.uav.platform.modules.auth.dto.response.AuthResponse;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class AuthCookieHelper {

    public static final String ACCESS_TOKEN_COOKIE = "uav_access_token";
    public static final String REFRESH_TOKEN_COOKIE = "uav_refresh_token";

    private final boolean secure;
    private final String sameSite;
    private final String domain;

    public AuthCookieHelper(
            @Value("${app.cookie.secure:false}") boolean secure,
            @Value("${app.cookie.same-site:Lax}") String sameSite,
            @Value("${app.cookie.domain:}") String domain) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.domain = domain;
    }

    public ResponseCookie createAccessTokenCookie(String token, long maxAgeSeconds) {
        ResponseCookie.ResponseCookieBuilder builder =
                ResponseCookie.from(ACCESS_TOKEN_COOKIE, token)
                        .httpOnly(true)
                        .secure(secure)
                        .sameSite(sameSite)
                        .path("/")
                        .maxAge(Duration.ofSeconds(maxAgeSeconds));

        if (domain != null && !domain.isBlank()) {
            builder.domain(domain.trim());
        }
        return builder.build();
    }

    public ResponseCookie createRefreshTokenCookie(String refreshToken, long maxAgeSeconds) {
        ResponseCookie.ResponseCookieBuilder builder =
                ResponseCookie.from(REFRESH_TOKEN_COOKIE, refreshToken)
                        .httpOnly(true)
                        .secure(secure)
                        .sameSite(sameSite)
                        .path("/api/v1/auth")
                        .maxAge(Duration.ofSeconds(maxAgeSeconds));

        if (domain != null && !domain.isBlank()) {
            builder.domain(domain.trim());
        }
        return builder.build();
    }

    public ResponseCookie clearAccessTokenCookie() {
        ResponseCookie.ResponseCookieBuilder builder =
                ResponseCookie.from(ACCESS_TOKEN_COOKIE, "")
                        .httpOnly(true)
                        .secure(secure)
                        .sameSite(sameSite)
                        .path("/")
                        .maxAge(0);

        if (domain != null && !domain.isBlank()) {
            builder.domain(domain.trim());
        }
        return builder.build();
    }

    public ResponseCookie clearRefreshTokenCookie() {
        ResponseCookie.ResponseCookieBuilder builder =
                ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                        .httpOnly(true)
                        .secure(secure)
                        .sameSite(sameSite)
                        .path("/api/v1/auth")
                        .maxAge(0);

        if (domain != null && !domain.isBlank()) {
            builder.domain(domain.trim());
        }
        return builder.build();
    }

    public String resolveAccessToken(HttpServletRequest request) {
        if (request == null || request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (ACCESS_TOKEN_COOKIE.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    public String resolveRefreshToken(HttpServletRequest request) {
        if (request == null || request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (REFRESH_TOKEN_COOKIE.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    public static ResponseEntity<AuthResponse> okWithCookies(
            AuthCookieHelper helper, AuthResponse response) {
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (helper != null) {
            if (response.accessToken() != null) {
                builder.header(
                        HttpHeaders.SET_COOKIE,
                        helper.createAccessTokenCookie(response.accessToken(), 86400).toString());
            }
            if (response.refreshToken() != null) {
                builder.header(
                        HttpHeaders.SET_COOKIE,
                        helper.createRefreshTokenCookie(response.refreshToken(), 604800)
                                .toString());
            }
        }
        return builder.body(response);
    }

    public static RefreshTokenRequest requireRefreshRequest(
            AuthCookieHelper helper, HttpServletRequest httpRequest, RefreshTokenRequest request) {
        String tokenString = request != null ? request.refreshToken() : null;
        if ((tokenString == null || tokenString.isBlank()) && helper != null) {
            tokenString = helper.resolveRefreshToken(httpRequest);
        }
        if (tokenString == null || tokenString.isBlank()) {
            throw SystemException.badRequest("Refresh token is required");
        }
        return new RefreshTokenRequest(tokenString);
    }

    public static String extractAccessToken(AuthCookieHelper helper, HttpServletRequest request) {
        String authHeader = request != null ? request.getHeader("Authorization") : null;
        if (authHeader != null && authHeader.trim().regionMatches(true, 0, "Bearer ", 0, 7)) {
            return authHeader.trim().substring(7).trim();
        }
        return helper != null ? helper.resolveAccessToken(request) : null;
    }

    public static String extractRefreshToken(
            AuthCookieHelper helper, HttpServletRequest request, LogoutRequest logoutRequest) {
        String refreshToken = logoutRequest != null ? logoutRequest.refreshToken() : null;
        if ((refreshToken == null || refreshToken.isBlank()) && helper != null) {
            return helper.resolveRefreshToken(request);
        }
        return refreshToken;
    }

    public static ResponseEntity<MessageResponse> okClearedCookies(
            AuthCookieHelper helper, String message) {
        ResponseEntity.BodyBuilder builder = ResponseEntity.ok();
        if (helper != null) {
            builder.header(HttpHeaders.SET_COOKIE, helper.clearAccessTokenCookie().toString());
            builder.header(HttpHeaders.SET_COOKIE, helper.clearRefreshTokenCookie().toString());
        }
        return builder.body(new MessageResponse(message));
    }

    public static String requireAuthenticatedUsername(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw SystemException.unauthorized("Authentication required");
        }
        return authentication.getName();
    }
}
