package com.uav.platform.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
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
}
