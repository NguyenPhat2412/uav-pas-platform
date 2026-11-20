package com.uav.platform.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.uav.platform.dto.request.auth.session.LogoutRequest;
import com.uav.platform.dto.request.auth.session.RefreshTokenRequest;
import com.uav.platform.dto.response.auth.session.AuthResponse;
import com.uav.platform.error.SystemException;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.Duration;
import java.util.List;

@DisplayName("AuthCookieHelper Security Unit Tests")
class AuthCookieHelperTest {

    @Test
    @DisplayName("Access and refresh cookies enforce HttpOnly, Secure, SameSite, Path and Domain")
    void cookieCreation_enforcesSecurityAttributes() {
        AuthCookieHelper helper = new AuthCookieHelper(true, "Strict", " .uav.local ");

        ResponseCookie access = helper.createAccessTokenCookie("jwt-access", 3600);
        assertEquals(AuthCookieHelper.ACCESS_TOKEN_COOKIE, access.getName());
        assertEquals("jwt-access", access.getValue());
        assertTrue(access.isHttpOnly());
        assertTrue(access.isSecure());
        assertEquals("Strict", access.getSameSite());
        assertEquals("/", access.getPath());
        assertEquals(".uav.local", access.getDomain());
        assertEquals(Duration.ofSeconds(3600), access.getMaxAge());

        ResponseCookie refresh = helper.createRefreshTokenCookie("opaque-refresh", 604800);
        assertEquals(AuthCookieHelper.REFRESH_TOKEN_COOKIE, refresh.getName());
        assertEquals("opaque-refresh", refresh.getValue());
        assertTrue(refresh.isHttpOnly());
        assertTrue(refresh.isSecure());
        assertEquals("Strict", refresh.getSameSite());
        assertEquals("/api/v1/auth", refresh.getPath());
        assertEquals(".uav.local", refresh.getDomain());
        assertEquals(Duration.ofSeconds(604800), refresh.getMaxAge());

        ResponseCookie presence = helper.createSessionPresenceCookie(604800);
        assertEquals(AuthCookieHelper.SESSION_PRESENCE_COOKIE, presence.getName());
        assertEquals("1", presence.getValue());
        assertFalse(presence.isHttpOnly());
        assertTrue(presence.isSecure());
        assertEquals("/", presence.getPath());
    }

    @Test
    @DisplayName("Clear cookies expire immediately with Max-Age=0 and blank domain omitted")
    void clearCookies_setsZeroMaxAgeAndOmitsBlankDomain() {
        AuthCookieHelper helper = new AuthCookieHelper(false, "Lax", "   ");

        ResponseCookie clearAccess = helper.clearAccessTokenCookie();
        ResponseCookie clearRefresh = helper.clearRefreshTokenCookie();
        ResponseCookie clearPresence = helper.clearSessionPresenceCookie();

        assertEquals(Duration.ZERO, clearAccess.getMaxAge());
        assertEquals("", clearAccess.getValue());
        assertTrue(clearAccess.isHttpOnly());
        assertNull(clearAccess.getDomain());

        assertEquals(Duration.ZERO, clearRefresh.getMaxAge());
        assertEquals("/api/v1/auth", clearRefresh.getPath());
        assertTrue(clearRefresh.isHttpOnly());
        assertNull(clearRefresh.getDomain());

        assertEquals(Duration.ZERO, clearPresence.getMaxAge());
        assertFalse(clearPresence.isHttpOnly());
        assertNull(clearPresence.getDomain());
    }

    @Test
    @DisplayName("resolveAccessToken and resolveRefreshToken safely handle missing or null cookies")
    void resolveTokens_handlesEdgeCases() {
        AuthCookieHelper helper = new AuthCookieHelper(false, "Lax", "");

        assertNull(helper.resolveAccessToken(null));
        assertNull(helper.resolveRefreshToken(null));

        MockHttpServletRequest emptyRequest = new MockHttpServletRequest();
        assertNull(helper.resolveAccessToken(emptyRequest));
        assertNull(helper.resolveRefreshToken(emptyRequest));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(
                new Cookie("other", "value"),
                new Cookie(AuthCookieHelper.ACCESS_TOKEN_COOKIE, "acc-123"),
                new Cookie(AuthCookieHelper.REFRESH_TOKEN_COOKIE, "ref-456"));

        assertEquals("acc-123", helper.resolveAccessToken(request));
        assertEquals("ref-456", helper.resolveRefreshToken(request));
    }

    @Test
    @DisplayName("extractAccessToken prefers case-insensitive Bearer header over cookie")
    void extractAccessToken_prefersBearerOverCookie() {
        AuthCookieHelper helper = new AuthCookieHelper(false, "Lax", "");

        MockHttpServletRequest bearerRequest = new MockHttpServletRequest();
        bearerRequest.addHeader(HttpHeaders.AUTHORIZATION, "bearer   header-jwt  ");
        bearerRequest.setCookies(new Cookie(AuthCookieHelper.ACCESS_TOKEN_COOKIE, "cookie-jwt"));
        assertEquals("header-jwt", AuthCookieHelper.extractAccessToken(helper, bearerRequest));

        MockHttpServletRequest cookieOnlyRequest = new MockHttpServletRequest();
        cookieOnlyRequest.setCookies(
                new Cookie(AuthCookieHelper.ACCESS_TOKEN_COOKIE, "cookie-jwt"));
        assertEquals("cookie-jwt", AuthCookieHelper.extractAccessToken(helper, cookieOnlyRequest));

        MockHttpServletRequest nonBearerRequest = new MockHttpServletRequest();
        nonBearerRequest.addHeader(HttpHeaders.AUTHORIZATION, "Basic dXNlcjpwYXNz");
        nonBearerRequest.setCookies(new Cookie(AuthCookieHelper.ACCESS_TOKEN_COOKIE, "cookie-jwt"));
        assertEquals("cookie-jwt", AuthCookieHelper.extractAccessToken(helper, nonBearerRequest));
    }

    @Test
    @DisplayName("requireRefreshRequest falls back to cookie and throws 400 when absent")
    void requireRefreshRequest_validatesPresence() {
        AuthCookieHelper helper = new AuthCookieHelper(false, "Lax", "");

        MockHttpServletRequest requestWithCookie = new MockHttpServletRequest();
        requestWithCookie.setCookies(
                new Cookie(AuthCookieHelper.REFRESH_TOKEN_COOKIE, "cookie-refresh"));

        RefreshTokenRequest fromBody =
                AuthCookieHelper.requireRefreshRequest(
                        helper, requestWithCookie, new RefreshTokenRequest("body-refresh"));
        assertEquals("body-refresh", fromBody.refreshToken());

        RefreshTokenRequest fromCookie =
                AuthCookieHelper.requireRefreshRequest(
                        helper, requestWithCookie, new RefreshTokenRequest("  "));
        assertEquals("cookie-refresh", fromCookie.refreshToken());

        MockHttpServletRequest emptyRequest = new MockHttpServletRequest();
        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () -> AuthCookieHelper.requireRefreshRequest(helper, emptyRequest, null));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    @DisplayName("extractRefreshToken resolves from LogoutRequest body or falls back to cookie")
    void extractRefreshToken_bodyOrCookie() {
        AuthCookieHelper helper = new AuthCookieHelper(false, "Lax", "");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(AuthCookieHelper.REFRESH_TOKEN_COOKIE, "cookie-ref"));

        assertEquals(
                "body-ref",
                AuthCookieHelper.extractRefreshToken(
                        helper, request, new LogoutRequest("body-ref")));
        assertEquals(
                "cookie-ref",
                AuthCookieHelper.extractRefreshToken(helper, request, new LogoutRequest("")));
        assertEquals("cookie-ref", AuthCookieHelper.extractRefreshToken(helper, request, null));
    }

    @Test
    @DisplayName("okWithCookies and okClearedCookies attach expected Set-Cookie headers")
    void responseBuilders_attachExpectedCookies() {
        AuthCookieHelper helper = new AuthCookieHelper(true, "Lax", "");
        AuthResponse body = AuthResponse.of("acc-token", "ref-token", null);

        var ok = AuthCookieHelper.okWithCookies(helper, body);
        List<String> setCookies = ok.getHeaders().get(HttpHeaders.SET_COOKIE);
        assertNotNull(setCookies);
        assertEquals(3, setCookies.size());
        assertTrue(
                setCookies.stream()
                        .anyMatch(
                                c ->
                                        c.startsWith("uav_access_token=acc-token")
                                                && c.contains("HttpOnly")));
        assertTrue(
                setCookies.stream()
                        .anyMatch(
                                c ->
                                        c.startsWith("uav_refresh_token=ref-token")
                                                && c.contains("Path=/api/v1/auth")));
        assertTrue(setCookies.stream().anyMatch(c -> c.startsWith("uav_session_present=1")));

        var cleared = AuthCookieHelper.okClearedCookies(helper, "Logged out");
        List<String> clearedCookies = cleared.getHeaders().get(HttpHeaders.SET_COOKIE);
        assertNotNull(clearedCookies);
        assertEquals(3, clearedCookies.size());
        assertTrue(clearedCookies.stream().allMatch(c -> c.contains("Max-Age=0")));
    }

    @Test
    @DisplayName("requireAuthenticatedUsername rejects null, unauthenticated, and anonymousUser")
    void requireAuthenticatedUsername_enforcesAuthentication() {
        assertEquals(
                HttpStatus.UNAUTHORIZED,
                assertThrows(
                                SystemException.class,
                                () -> AuthCookieHelper.requireAuthenticatedUsername(null))
                        .getStatus());

        var unauthenticated = new TestingAuthenticationToken("alice", "pw");
        unauthenticated.setAuthenticated(false);
        assertEquals(
                HttpStatus.UNAUTHORIZED,
                assertThrows(
                                SystemException.class,
                                () ->
                                        AuthCookieHelper.requireAuthenticatedUsername(
                                                unauthenticated))
                        .getStatus());

        var anonymous =
                UsernamePasswordAuthenticationToken.authenticated("anonymousUser", null, List.of());
        assertEquals(
                HttpStatus.UNAUTHORIZED,
                assertThrows(
                                SystemException.class,
                                () -> AuthCookieHelper.requireAuthenticatedUsername(anonymous))
                        .getStatus());

        var valid = UsernamePasswordAuthenticationToken.authenticated("pilot01", null, List.of());
        assertEquals("pilot01", AuthCookieHelper.requireAuthenticatedUsername(valid));
    }
}
