package com.uav.platform.modules.auth.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.dto.record.GoogleIdentity;
import com.uav.platform.modules.auth.service.GoogleIdTokenService;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

class GoogleIdTokenServiceImplTest {

    private static final String CLIENT_ID = "web-client.apps.googleusercontent.com";
    private static final long NOW = 1_800_000_000L;
    private static final Clock CLOCK = Clock.fixed(Instant.ofEpochSecond(NOW), ZoneOffset.UTC);

    private MockRestServiceServer server;

    private GoogleIdTokenServiceImpl verifier(String clientIds) {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        return new GoogleIdTokenServiceImpl(clientIds, builder, CLOCK);
    }

    private static String claims(String aud, String iss, long exp, String emailVerified) {
        return """
                {"aud":"%s","iss":"%s","exp":"%d","email_verified":"%s",
                 "email":"Jane.Doe@Example.com","sub":"10769150350006150715","name":"Jane Doe"}
                """
                .formatted(aud, iss, exp, emailVerified);
    }

    private void expectTokeninfo(String body) {
        server.expect(requestTo(Matchers.startsWith(GoogleIdTokenServiceImpl.TOKENINFO_URL)))
                .andExpect(method(HttpMethod.GET))
                .andExpect(queryParam("id_token", "id-token"))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    private static void assertInvalid(SystemException ex) {
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals(GoogleIdTokenService.INVALID_CODE, ex.getCode());
        assertEquals(GoogleIdTokenService.INVALID_MESSAGE, ex.getMessage());
    }

    @Test
    void validToken_ReturnsIdentityWithLowerCaseEmail() {
        GoogleIdTokenServiceImpl verifier = verifier(CLIENT_ID);
        expectTokeninfo(claims(CLIENT_ID, "https://accounts.google.com", NOW + 600, "true"));

        GoogleIdentity identity = verifier.verify("id-token");

        assertEquals("jane.doe@example.com", identity.email());
        assertEquals("Jane Doe", identity.name());
        assertEquals("10769150350006150715", identity.subject());
        server.verify();
    }

    @Test
    void bareIssuerAndSecondClientId_AreAccepted() {
        GoogleIdTokenServiceImpl verifier = verifier("other-client, " + CLIENT_ID + " ,");
        expectTokeninfo(claims(CLIENT_ID, "accounts.google.com", NOW + 60, "true"));

        assertEquals("jane.doe@example.com", verifier.verify("id-token").email());
    }

    @Test
    void wrongAudience_IsRejected() {
        GoogleIdTokenServiceImpl verifier = verifier(CLIENT_ID);
        expectTokeninfo(claims("someone-else", "accounts.google.com", NOW + 600, "true"));

        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify("id-token")));
    }

    @Test
    void wrongIssuer_IsRejected() {
        GoogleIdTokenServiceImpl verifier = verifier(CLIENT_ID);
        expectTokeninfo(claims(CLIENT_ID, "https://evil.example.com", NOW + 600, "true"));

        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify("id-token")));
    }

    @Test
    void expiredToken_IsRejected() {
        GoogleIdTokenServiceImpl verifier = verifier(CLIENT_ID);
        expectTokeninfo(claims(CLIENT_ID, "accounts.google.com", NOW - 1, "true"));

        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify("id-token")));
    }

    @Test
    void unverifiedEmail_IsRejected() {
        GoogleIdTokenServiceImpl verifier = verifier(CLIENT_ID);
        expectTokeninfo(claims(CLIENT_ID, "accounts.google.com", NOW + 600, "false"));

        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify("id-token")));
    }

    @Test
    void tokenRejectedByGoogle_IsInvalid() {
        GoogleIdTokenServiceImpl verifier = verifier(CLIENT_ID);
        server.expect(requestTo(Matchers.startsWith(GoogleIdTokenServiceImpl.TOKENINFO_URL)))
                .andRespond(
                        withStatus(HttpStatus.BAD_REQUEST)
                                .contentType(MediaType.APPLICATION_JSON)
                                .body("{\"error\":\"invalid_token\"}"));

        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify("id-token")));
    }

    @Test
    void googleServerError_Is503() {
        GoogleIdTokenServiceImpl verifier = verifier(CLIENT_ID);
        server.expect(requestTo(Matchers.startsWith(GoogleIdTokenServiceImpl.TOKENINFO_URL)))
                .andRespond(withStatus(HttpStatus.BAD_GATEWAY));

        SystemException ex = assertThrows(SystemException.class, () -> verifier.verify("id-token"));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertEquals(GoogleIdTokenService.UNAVAILABLE_CODE, ex.getCode());
    }

    @Test
    void googleUnreachable_Is503() {
        GoogleIdTokenServiceImpl verifier = verifier(CLIENT_ID);
        server.expect(requestTo(Matchers.startsWith(GoogleIdTokenServiceImpl.TOKENINFO_URL)))
                .andRespond(withException(new SocketTimeoutException("read timed out")));

        SystemException ex = assertThrows(SystemException.class, () -> verifier.verify("id-token"));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertEquals(GoogleIdTokenService.UNAVAILABLE_CODE, ex.getCode());
    }

    @Test
    void connectionRefused_Is503() {
        GoogleIdTokenServiceImpl verifier = verifier(CLIENT_ID);
        server.expect(requestTo(Matchers.startsWith(GoogleIdTokenServiceImpl.TOKENINFO_URL)))
                .andRespond(withException(new IOException("connection refused")));

        assertEquals(
                HttpStatus.SERVICE_UNAVAILABLE,
                assertThrows(SystemException.class, () -> verifier.verify("id-token")).getStatus());
    }

    @Test
    void blankCredential_IsInvalidWithoutCallingGoogle() {
        GoogleIdTokenServiceImpl verifier = verifier(CLIENT_ID);

        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify("  ")));
        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify(null)));
        server.verify();
    }

    @Test
    void emptyConfig_IsDisabledWith503() {
        GoogleIdTokenServiceImpl verifier = verifier("  ");

        assertFalse(verifier.isEnabled());
        SystemException ex = assertThrows(SystemException.class, () -> verifier.verify("id-token"));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertEquals(GoogleIdTokenService.DISABLED_CODE, ex.getCode());
        assertEquals("Đăng nhập Google chưa được cấu hình.", ex.getMessage());
        server.verify();
    }

    @Test
    void parseClientIds_SplitsAndTrims() {
        assertTrue(GoogleIdTokenServiceImpl.parseClientIds(null).isEmpty());
        assertEquals(2, GoogleIdTokenServiceImpl.parseClientIds(" a , ,b ").size());
    }

    @Test
    void missingName_IsAllowed() {
        GoogleIdTokenServiceImpl verifier = verifier(CLIENT_ID);
        expectTokeninfo(
                """
                {"aud":"%s","iss":"accounts.google.com","exp":%d,"email_verified":true,
                 "email":"a@b.co","sub":"1"}
                """
                        .formatted(CLIENT_ID, NOW + 600));

        assertNull(verifier.verify("id-token").name());
    }
}
