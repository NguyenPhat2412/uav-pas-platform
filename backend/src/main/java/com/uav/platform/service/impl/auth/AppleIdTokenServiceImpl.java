package com.uav.platform.service.impl.auth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.common.util.Hashing;
import com.uav.platform.dto.record.auth.AppleIdentity;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.auth.AppleIdTokenService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.Signature;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collection;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Cryptographically verifies Apple ID tokens (RS256 compact JWS) against Apple's published JWKS at
 * {@code https://appleid.apple.com/auth/keys}, caching RSA public keys for 1 hour with a single
 * forced refresh when an unknown {@code kid} appears (supporting seamless Apple key rotation).
 */
@Slf4j
@Service
public class AppleIdTokenServiceImpl implements AppleIdTokenService {

    static final String JWKS_URL = "https://appleid.apple.com/auth/keys";
    static final String ISSUER = "https://appleid.apple.com";
    static final String EXPECTED_ALG = "RS256";
    static final int MAX_CREDENTIAL_LENGTH = 8192;
    static final int MAX_SUB_LENGTH = 128;
    static final Duration CACHE_TTL = Duration.ofHours(1);

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(5);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final Set<String> clientIds;
    private final RestClient restClient;
    private final Clock clock;
    private final Object cacheMonitor = new Object();
    private volatile CachedKeys cachedKeys;

    private static final class CachedKeys {
        final Map<String, RSAPublicKey> keys;
        final Instant expiresAt;

        CachedKeys(Map<String, RSAPublicKey> keys, Instant expiresAt) {
            this.keys = keys;
            this.expiresAt = expiresAt;
        }
    }

    @Autowired
    public AppleIdTokenServiceImpl(@Value("${app.auth.apple.client-ids:}") String clientIds) {
        this(clientIds, defaultBuilder(), Clock.systemUTC());
    }

    /** For tests: bind {@code builder} to a mock server and pass a deterministic {@code clock}. */
    public AppleIdTokenServiceImpl(String clientIds, RestClient.Builder builder, Clock clock) {
        this.clientIds = parseClientIds(clientIds);
        this.restClient = builder.build();
        this.clock = clock;
    }

    static RestClient.Builder defaultBuilder() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT);
        factory.setReadTimeout(READ_TIMEOUT);
        return RestClient.builder().requestFactory(factory);
    }

    static Set<String> parseClientIds(String raw) {
        if (raw == null) return Set.of();
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public boolean isEnabled() {
        return !clientIds.isEmpty();
    }

    @Override
    public AppleIdentity verify(String credential, String expectedNonce) {
        if (!isEnabled()) {
            throw SystemException.serviceUnavailable(DISABLED_MESSAGE, DISABLED_CODE);
        }
        if (credential == null
                || credential.isBlank()
                || credential.length() > MAX_CREDENTIAL_LENGTH) {
            throw invalid("missing or oversized credential");
        }
        String trimmed = credential.trim();
        String[] parts = trimmed.split("\\.", -1);
        if (parts.length != 3 || parts[0].isEmpty() || parts[1].isEmpty() || parts[2].isEmpty()) {
            throw invalid("malformed compact JWS segments");
        }

        Map<String, Object> header = parseJsonObject(base64UrlDecode(parts[0]), "header");
        String alg = text(header.get("alg"));
        if (!EXPECTED_ALG.equals(alg)) {
            throw invalid("unsupported JWS alg: " + alg);
        }
        String kid = text(header.get("kid"));
        if (kid == null) {
            throw invalid("missing kid in JWS header");
        }

        Map<String, Object> claims = parseJsonObject(base64UrlDecode(parts[1]), "payload");
        byte[] signatureBytes = base64UrlDecode(parts[2]);

        RSAPublicKey publicKey = resolveKey(kid);
        verifySignature(parts[0] + "." + parts[1], signatureBytes, publicKey);

        return checkClaims(claims, expectedNonce);
    }

    private RSAPublicKey resolveKey(String kid) {
        Instant now = clock.instant();
        CachedKeys snapshot = cachedKeys;
        if (snapshot != null && now.isBefore(snapshot.expiresAt)) {
            RSAPublicKey cached = snapshot.keys.get(kid);
            if (cached != null) {
                return cached;
            }
            // Unknown kid while cache is warm: perform a single forced refresh for key rotation.
            CachedKeys refreshed = refreshKeys(snapshot);
            RSAPublicKey rotated = refreshed.keys.get(kid);
            if (rotated == null) {
                throw invalid("unknown Apple JWK kid after refresh");
            }
            return rotated;
        }

        CachedKeys fresh = refreshKeys(snapshot);
        RSAPublicKey key = fresh.keys.get(kid);
        if (key == null) {
            throw invalid("unknown Apple JWK kid");
        }
        return key;
    }

    private CachedKeys refreshKeys(CachedKeys previousSnapshot) {
        synchronized (cacheMonitor) {
            Instant now = clock.instant();
            if (cachedKeys != null
                    && cachedKeys != previousSnapshot
                    && now.isBefore(cachedKeys.expiresAt)) {
                return cachedKeys;
            }
            Map<String, Object> body;
            try {
                body =
                        restClient
                                .get()
                                .uri(JWKS_URL)
                                .retrieve()
                                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            } catch (RestClientException e) {
                log.warn("Apple JWKS unavailable: {}", e.getClass().getSimpleName());
                throw SystemException.serviceUnavailable(UNAVAILABLE_MESSAGE, UNAVAILABLE_CODE);
            }
            Map<String, RSAPublicKey> parsed = parseJwks(body);
            CachedKeys updated = new CachedKeys(parsed, clock.instant().plus(CACHE_TTL));
            cachedKeys = updated;
            return updated;
        }
    }

    private static Map<String, RSAPublicKey> parseJwks(Map<String, Object> jwks) {
        if (jwks == null || !(jwks.get("keys") instanceof List<?> rawKeys) || rawKeys.isEmpty()) {
            throw SystemException.serviceUnavailable(UNAVAILABLE_MESSAGE, UNAVAILABLE_CODE);
        }
        Map<String, RSAPublicKey> keys = new HashMap<>();
        try {
            KeyFactory rsaFactory = KeyFactory.getInstance("RSA");
            for (Object item : rawKeys) {
                if (!(item instanceof Map<?, ?> entry)) continue;
                if (!"RSA".equals(text(entry.get("kty")))) continue;
                String kid = text(entry.get("kid"));
                String n = text(entry.get("n"));
                String e = text(entry.get("e"));
                if (kid == null || n == null || e == null) continue;
                byte[] modulusBytes = base64UrlDecodeRaw(n);
                byte[] exponentBytes = base64UrlDecodeRaw(e);
                if (modulusBytes == null
                        || modulusBytes.length == 0
                        || exponentBytes == null
                        || exponentBytes.length == 0) {
                    continue;
                }
                RSAPublicKeySpec spec =
                        new RSAPublicKeySpec(
                                new BigInteger(1, modulusBytes), new BigInteger(1, exponentBytes));
                keys.put(kid, (RSAPublicKey) rsaFactory.generatePublic(spec));
            }
        } catch (GeneralSecurityException ex) {
            log.warn("Failed to reconstruct Apple RSA public key: {}", ex.getMessage());
            throw SystemException.serviceUnavailable(UNAVAILABLE_MESSAGE, UNAVAILABLE_CODE);
        }
        if (keys.isEmpty()) {
            throw SystemException.serviceUnavailable(UNAVAILABLE_MESSAGE, UNAVAILABLE_CODE);
        }
        return Map.copyOf(keys);
    }

    private static void verifySignature(
            String signingInput, byte[] signatureBytes, RSAPublicKey publicKey) {
        try {
            Signature signature = Signature.getInstance("SHA256withRSA");
            signature.initVerify(publicKey);
            signature.update(signingInput.getBytes(StandardCharsets.US_ASCII));
            if (!signature.verify(signatureBytes)) {
                throw invalid("RS256 signature mismatch");
            }
        } catch (GeneralSecurityException e) {
            throw invalid("RS256 signature verification error");
        }
    }

    AppleIdentity checkClaims(Map<String, Object> claims, String expectedNonce) {
        String iss = text(claims.get("iss"));
        if (!ISSUER.equals(iss)) {
            throw invalid("issuer mismatch");
        }

        if (!audienceMatches(claims.get("aud"))) {
            throw invalid("audience mismatch");
        }

        Long exp = number(claims.get("exp"));
        if (exp == null || exp <= clock.instant().getEpochSecond()) {
            throw invalid("expired");
        }

        String sub = text(claims.get("sub"));
        if (sub == null || sub.length() > MAX_SUB_LENGTH) {
            throw invalid("missing or oversized subject");
        }

        if (expectedNonce != null && !expectedNonce.isBlank()) {
            String rawExpected = expectedNonce.trim();
            String tokenNonce = text(claims.get("nonce"));
            if (tokenNonce == null || !nonceMatches(tokenNonce, rawExpected)) {
                throw invalid("nonce mismatch");
            }
        }

        String rawEmail = text(claims.get("email"));
        if (rawEmail != null) {
            if (!rawEmail.contains("@")) {
                throw invalid("malformed email claim");
            }
            if (!isTrue(claims.get("email_verified"))) {
                throw invalid("email not verified");
            }
            return new AppleIdentity(sub, rawEmail.toLowerCase(Locale.ROOT), true);
        }

        return new AppleIdentity(sub, null, isTrue(claims.get("email_verified")));
    }

    private boolean audienceMatches(Object audClaim) {
        if (audClaim instanceof Collection<?> values) {
            for (Object v : values) {
                String aud = text(v);
                if (aud != null && clientIds.contains(aud)) {
                    return true;
                }
            }
            return false;
        }
        String aud = text(audClaim);
        return aud != null && clientIds.contains(aud);
    }

    private static boolean nonceMatches(String tokenNonce, String expectedNonce) {
        byte[] tokenBytes = tokenNonce.getBytes(StandardCharsets.UTF_8);
        if (MessageDigest.isEqual(tokenBytes, expectedNonce.getBytes(StandardCharsets.UTF_8))) {
            return true;
        }
        byte[] sha256 = Hashing.sha256(expectedNonce);
        String hex = HexFormat.of().formatHex(sha256);
        if (MessageDigest.isEqual(tokenBytes, hex.getBytes(StandardCharsets.UTF_8))) {
            return true;
        }
        String base64UrlNoPad = Base64.getUrlEncoder().withoutPadding().encodeToString(sha256);
        if (MessageDigest.isEqual(tokenBytes, base64UrlNoPad.getBytes(StandardCharsets.UTF_8))) {
            return true;
        }
        String base64UrlPadded = Base64.getUrlEncoder().encodeToString(sha256);
        return MessageDigest.isEqual(tokenBytes, base64UrlPadded.getBytes(StandardCharsets.UTF_8));
    }

    private static byte[] base64UrlDecode(String segment) {
        byte[] decoded = base64UrlDecodeRaw(segment);
        if (decoded == null) {
            throw invalid("invalid base64url segment");
        }
        return decoded;
    }

    private static byte[] base64UrlDecodeRaw(String value) {
        try {
            return Base64.getUrlDecoder().decode(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static Map<String, Object> parseJsonObject(byte[] jsonBytes, String partName) {
        try {
            Map<String, Object> map = OBJECT_MAPPER.readValue(jsonBytes, MAP_TYPE);
            if (map == null) {
                throw invalid("null JWS " + partName);
            }
            return map;
        } catch (IOException e) {
            throw invalid("malformed JWS " + partName);
        }
    }

    private static SystemException invalid(String reason) {
        log.debug("Apple ID token rejected: {}", reason);
        return SystemException.unauthorized(INVALID_MESSAGE, INVALID_CODE);
    }

    private static String text(Object value) {
        if (value == null) return null;
        String s = value.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private static Long number(Object value) {
        if (value instanceof Number n) return n.longValue();
        String s = text(value);
        if (s == null) return null;
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static boolean isTrue(Object value) {
        return Boolean.TRUE.equals(value) || "true".equalsIgnoreCase(text(value));
    }
}
