package com.uav.platform.service.impl.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dto.record.auth.AppleIdentity;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.auth.AppleIdTokenService;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigInteger;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.interfaces.RSAPublicKey;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;

class AppleIdTokenServiceImplTest {

    private static final String WEB_CLIENT_ID = "vn.all1.uavpas.web";
    private static final String IOS_BUNDLE_ID = "vn.all1.uavpas";
    private static final long NOW = 1_800_000_000L;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static KeyPair keyPair1;
    private static KeyPair keyPair2;
    private static KeyPair attackerKeyPair;

    private MockRestServiceServer server;
    private MutableClock clock;

    @BeforeAll
    static void generateRsaKeys() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        keyPair1 = generator.generateKeyPair();
        keyPair2 = generator.generateKeyPair();
        attackerKeyPair = generator.generateKeyPair();
    }

    private static final class MutableClock extends Clock {
        private Instant current;

        MutableClock(Instant initial) {
            this.current = initial;
        }

        void advance(Duration duration) {
            this.current = this.current.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return current;
        }
    }

    private AppleIdTokenServiceImpl verifier(String clientIds) {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        clock = new MutableClock(Instant.ofEpochSecond(NOW));
        return new AppleIdTokenServiceImpl(clientIds, builder, clock);
    }

    private static String base64UrlUnsigned(BigInteger value) {
        byte[] bytes = value.toByteArray();
        if (bytes.length > 1 && bytes[0] == 0) {
            bytes = Arrays.copyOfRange(bytes, 1, bytes.length);
        }
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String jwksJson(String kid, RSAPublicKey publicKey) {
        return """
                {"keys":[{"kty":"RSA","kid":"%s","use":"sig","alg":"RS256","n":"%s","e":"%s"}]}
                """
                .formatted(
                        kid,
                        base64UrlUnsigned(publicKey.getModulus()),
                        base64UrlUnsigned(publicKey.getPublicExponent()));
    }

    private void expectJwks(String kid, KeyPair pair) {
        server.expect(requestTo(AppleIdTokenServiceImpl.JWKS_URL))
                .andExpect(method(HttpMethod.GET))
                .andRespond(
                        withSuccess(
                                jwksJson(kid, (RSAPublicKey) pair.getPublic()),
                                MediaType.APPLICATION_JSON));
    }

    private static String signJwt(
            String kid, String alg, Map<String, Object> claims, PrivateKey privateKey) {
        try {
            Map<String, Object> header = new LinkedHashMap<>();
            header.put("alg", alg);
            if (kid != null) {
                header.put("kid", kid);
            }
            String headerB64 =
                    Base64.getUrlEncoder()
                            .withoutPadding()
                            .encodeToString(MAPPER.writeValueAsBytes(header));
            String payloadB64 =
                    Base64.getUrlEncoder()
                            .withoutPadding()
                            .encodeToString(MAPPER.writeValueAsBytes(claims));
            String signingInput = headerB64 + "." + payloadB64;

            Signature sig = Signature.getInstance("SHA256withRSA");
            sig.initSign(privateKey);
            sig.update(signingInput.getBytes(StandardCharsets.US_ASCII));
            String sigB64 = Base64.getUrlEncoder().withoutPadding().encodeToString(sig.sign());
            return signingInput + "." + sigB64;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static Map<String, Object> validClaims() {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("iss", "https://appleid.apple.com");
        claims.put("aud", WEB_CLIENT_ID);
        claims.put("exp", NOW + 600);
        claims.put("iat", NOW - 10);
        claims.put("sub", "001234.abcdef1234567890.0912");
        claims.put("email", "Pilot.User@privaterelay.appleid.com");
        claims.put("email_verified", "true");
        return claims;
    }

    private static void assertInvalid(SystemException ex) {
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        assertEquals(AppleIdTokenService.INVALID_CODE, ex.getCode());
        assertEquals(AppleIdTokenService.INVALID_MESSAGE, ex.getMessage());
    }

    @Test
    void validSignedToken_VerifiesAndCachesJwksAcrossSubsequentCalls() {
        AppleIdTokenServiceImpl verifier = verifier(WEB_CLIENT_ID + ", " + IOS_BUNDLE_ID);
        expectJwks("kid-1", keyPair1);

        String jwt1 = signJwt("kid-1", "RS256", validClaims(), keyPair1.getPrivate());
        AppleIdentity first = verifier.verify(jwt1, null);

        assertEquals("001234.abcdef1234567890.0912", first.sub());
        assertEquals("pilot.user@privaterelay.appleid.com", first.email());
        assertTrue(first.emailVerified());

        // Second token with iOS bundle ID audience uses the cached JWKS without another HTTP call.
        Map<String, Object> secondClaims = validClaims();
        secondClaims.put("aud", IOS_BUNDLE_ID);
        secondClaims.remove("email");
        secondClaims.remove("email_verified");
        String jwt2 = signJwt("kid-1", "RS256", secondClaims, keyPair1.getPrivate());

        AppleIdentity second = verifier.verify(jwt2);
        assertEquals("001234.abcdef1234567890.0912", second.sub());
        assertNull(second.email());
        assertFalse(second.emailVerified());
        server.verify();
    }

    @Test
    void rotatedKid_TriggersSingleForcedJwksRefresh() {
        AppleIdTokenServiceImpl verifier = verifier(WEB_CLIENT_ID);
        expectJwks("kid-1", keyPair1);
        expectJwks("kid-2", keyPair2);

        verifier.verify(signJwt("kid-1", "RS256", validClaims(), keyPair1.getPrivate()));

        AppleIdentity rotated =
                verifier.verify(signJwt("kid-2", "RS256", validClaims(), keyPair2.getPrivate()));
        assertEquals("001234.abcdef1234567890.0912", rotated.sub());
        server.verify();
    }

    @Test
    void unknownKidAfterForcedRefresh_IsRejectedWithoutLooping() {
        AppleIdTokenServiceImpl verifier = verifier(WEB_CLIENT_ID);
        expectJwks("kid-1", keyPair1);
        expectJwks("kid-1", keyPair1);

        verifier.verify(signJwt("kid-1", "RS256", validClaims(), keyPair1.getPrivate()));

        String unknownKidJwt =
                signJwt("kid-unknown", "RS256", validClaims(), keyPair2.getPrivate());
        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify(unknownKidJwt)));
        server.verify();
    }

    @Test
    void expiredCacheAfterOneHour_RefetchesJwks() {
        AppleIdTokenServiceImpl verifier = verifier(WEB_CLIENT_ID);
        expectJwks("kid-1", keyPair1);
        expectJwks("kid-1", keyPair1);

        verifier.verify(signJwt("kid-1", "RS256", validClaims(), keyPair1.getPrivate()));
        clock.advance(Duration.ofMinutes(61));

        Map<String, Object> laterClaims = validClaims();
        laterClaims.put("exp", clock.instant().getEpochSecond() + 600);
        verifier.verify(signJwt("kid-1", "RS256", laterClaims, keyPair1.getPrivate()));
        server.verify();
    }

    @Test
    void nonceValidation_AcceptsRawHexSha256AndBase64UrlSha256AndRejectsMismatch()
            throws Exception {
        AppleIdTokenServiceImpl verifier = verifier(WEB_CLIENT_ID);
        expectJwks("kid-1", keyPair1);

        String rawNonce = "nonce-raw-secret-98765";
        byte[] digest =
                MessageDigest.getInstance("SHA-256")
                        .digest(rawNonce.getBytes(StandardCharsets.UTF_8));
        String hexNonce = HexFormat.of().formatHex(digest);
        String b64UrlNonce = Base64.getUrlEncoder().withoutPadding().encodeToString(digest);

        Map<String, Object> rawClaims = validClaims();
        rawClaims.put("nonce", rawNonce);
        assertEquals(
                "001234.abcdef1234567890.0912",
                verifier.verify(
                                signJwt("kid-1", "RS256", rawClaims, keyPair1.getPrivate()),
                                rawNonce)
                        .sub());

        Map<String, Object> hexClaims = validClaims();
        hexClaims.put("nonce", hexNonce);
        assertEquals(
                "001234.abcdef1234567890.0912",
                verifier.verify(
                                signJwt("kid-1", "RS256", hexClaims, keyPair1.getPrivate()),
                                rawNonce)
                        .sub());

        Map<String, Object> b64Claims = validClaims();
        b64Claims.put("nonce", b64UrlNonce);
        assertEquals(
                "001234.abcdef1234567890.0912",
                verifier.verify(
                                signJwt("kid-1", "RS256", b64Claims, keyPair1.getPrivate()),
                                rawNonce)
                        .sub());

        assertInvalid(
                assertThrows(
                        SystemException.class,
                        () ->
                                verifier.verify(
                                        signJwt("kid-1", "RS256", hexClaims, keyPair1.getPrivate()),
                                        "different-nonce")));

        Map<String, Object> noNonceClaims = validClaims();
        assertInvalid(
                assertThrows(
                        SystemException.class,
                        () ->
                                verifier.verify(
                                        signJwt(
                                                "kid-1",
                                                "RS256",
                                                noNonceClaims,
                                                keyPair1.getPrivate()),
                                        rawNonce)));
        server.verify();
    }

    @Test
    void tamperedPayloadOrWrongSigningKey_IsRejected() {
        AppleIdTokenServiceImpl verifier = verifier(WEB_CLIENT_ID);
        expectJwks("kid-1", keyPair1);

        // Signed with attacker's RSA key instead of Apple's keyPair1
        String forgedJwt = signJwt("kid-1", "RS256", validClaims(), attackerKeyPair.getPrivate());
        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify(forgedJwt)));

        // Valid signature, then payload tampered afterwards
        String validJwt = signJwt("kid-1", "RS256", validClaims(), keyPair1.getPrivate());
        String[] parts = validJwt.split("\\.");
        Map<String, Object> tamperedClaims = validClaims();
        tamperedClaims.put("email", "victim@icloud.com");
        String tamperedPayload =
                Base64.getUrlEncoder()
                        .withoutPadding()
                        .encodeToString(
                                "{\"iss\":\"https://appleid.apple.com\",\"aud\":\"vn.all1.uavpas.web\",\"exp\":1800000600,\"sub\":\"victim\"}"
                                        .getBytes(StandardCharsets.UTF_8));
        String tamperedJwt = parts[0] + "." + tamperedPayload + "." + parts[2];
        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify(tamperedJwt)));
        server.verify();
    }

    @Test
    void expiredWrongAudWrongIssUnverifiedEmailAndOversizedSub_AreRejected() {
        AppleIdTokenServiceImpl verifier = verifier(WEB_CLIENT_ID);
        expectJwks("kid-1", keyPair1);

        Map<String, Object> expired = validClaims();
        expired.put("exp", NOW);
        assertInvalid(
                assertThrows(
                        SystemException.class,
                        () ->
                                verifier.verify(
                                        signJwt(
                                                "kid-1",
                                                "RS256",
                                                expired,
                                                keyPair1.getPrivate()))));

        Map<String, Object> wrongAud = validClaims();
        wrongAud.put("aud", "com.other.app");
        assertInvalid(
                assertThrows(
                        SystemException.class,
                        () ->
                                verifier.verify(
                                        signJwt(
                                                "kid-1",
                                                "RS256",
                                                wrongAud,
                                                keyPair1.getPrivate()))));

        Map<String, Object> wrongIss = validClaims();
        wrongIss.put("iss", "https://evil.example.com");
        assertInvalid(
                assertThrows(
                        SystemException.class,
                        () ->
                                verifier.verify(
                                        signJwt(
                                                "kid-1",
                                                "RS256",
                                                wrongIss,
                                                keyPair1.getPrivate()))));

        Map<String, Object> unverifiedEmail = validClaims();
        unverifiedEmail.put("email_verified", "false");
        assertInvalid(
                assertThrows(
                        SystemException.class,
                        () ->
                                verifier.verify(
                                        signJwt(
                                                "kid-1",
                                                "RS256",
                                                unverifiedEmail,
                                                keyPair1.getPrivate()))));

        Map<String, Object> oversizedSub = validClaims();
        oversizedSub.put("sub", "s".repeat(129));
        assertInvalid(
                assertThrows(
                        SystemException.class,
                        () ->
                                verifier.verify(
                                        signJwt(
                                                "kid-1",
                                                "RS256",
                                                oversizedSub,
                                                keyPair1.getPrivate()))));
        server.verify();
    }

    @Test
    void malformedOrUnsupportedAlgOrBlankOrOversizedTokens_FailBeforeNetwork() {
        AppleIdTokenServiceImpl verifier = verifier(WEB_CLIENT_ID);

        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify(null)));
        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify("   ")));
        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify("a".repeat(8193))));
        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify("not-a-jwt")));
        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify("a.b")));

        String wrongAlgJwt = signJwt("kid-1", "HS256", validClaims(), keyPair1.getPrivate());
        assertInvalid(assertThrows(SystemException.class, () -> verifier.verify(wrongAlgJwt)));
        server.verify();
    }

    @Test
    void emptyConfig_Returns503Disabled() {
        AppleIdTokenServiceImpl verifier = verifier(" , ");

        assertFalse(verifier.isEnabled());
        SystemException ex =
                assertThrows(SystemException.class, () -> verifier.verify("any.jwt.token"));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
        assertEquals(AppleIdTokenService.DISABLED_CODE, ex.getCode());
        assertEquals(AppleIdTokenService.DISABLED_MESSAGE, ex.getMessage());
        server.verify();
    }

    @Test
    void appleJwksUnavailableOr5xx_Returns503Unavailable() {
        AppleIdTokenServiceImpl verifier1 = verifier(WEB_CLIENT_ID);
        server.expect(requestTo(AppleIdTokenServiceImpl.JWKS_URL))
                .andRespond(withStatus(HttpStatus.BAD_GATEWAY));
        String jwt = signJwt("kid-1", "RS256", validClaims(), keyPair1.getPrivate());

        SystemException ex1 = assertThrows(SystemException.class, () -> verifier1.verify(jwt));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex1.getStatus());
        assertEquals(AppleIdTokenService.UNAVAILABLE_CODE, ex1.getCode());

        AppleIdTokenServiceImpl verifier2 = verifier(WEB_CLIENT_ID);
        server.expect(requestTo(AppleIdTokenServiceImpl.JWKS_URL))
                .andRespond(withException(new SocketTimeoutException("read timed out")));

        SystemException ex2 = assertThrows(SystemException.class, () -> verifier2.verify(jwt));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex2.getStatus());
        assertEquals(AppleIdTokenService.UNAVAILABLE_CODE, ex2.getCode());
    }
}
