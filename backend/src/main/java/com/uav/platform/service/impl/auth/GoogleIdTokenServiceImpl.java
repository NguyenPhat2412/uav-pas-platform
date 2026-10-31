package com.uav.platform.service.impl.auth;

import com.uav.platform.dto.record.auth.GoogleIdentity;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.auth.GoogleIdTokenService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Clock;
import java.time.Duration;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Checks a Google ID token with Google's tokeninfo endpoint, which validates the signature and
 * expiry, then enforces the rest locally: the audience is one of our client IDs, the issuer is
 * Google, the token has not expired, and the email is verified.
 *
 * <p>Nimbus/Spring OAuth2 JOSE is not on the classpath, so tokeninfo is used instead of verifying
 * against Google's JWKS. Short timeouts keep a slow Google from holding request threads.
 */
@Slf4j
@Service
public class GoogleIdTokenServiceImpl implements GoogleIdTokenService {

    static final String TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
    static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

    /** Google ID tokens are around 1 KB; anything far larger is not one. */
    static final int MAX_CREDENTIAL_LENGTH = 8192;

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(5);

    private final Set<String> clientIds;
    private final RestClient restClient;
    private final Clock clock;

    @Autowired
    public GoogleIdTokenServiceImpl(@Value("${app.auth.google.client-ids:}") String clientIds) {
        this(clientIds, defaultBuilder(), Clock.systemUTC());
    }

    /** For tests: the builder can be bound to a mock server and the clock fixed. */
    public GoogleIdTokenServiceImpl(String clientIds, RestClient.Builder builder, Clock clock) {
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
    public GoogleIdentity verify(String credential) {
        if (!isEnabled()) {
            throw SystemException.serviceUnavailable(DISABLED_MESSAGE, DISABLED_CODE);
        }
        if (credential == null
                || credential.isBlank()
                || credential.length() > MAX_CREDENTIAL_LENGTH) {
            throw invalid("missing or oversized credential");
        }
        return checkClaims(fetchClaims(credential.trim()));
    }

    private Map<String, Object> fetchClaims(String credential) {
        try {
            Map<String, Object> claims =
                    restClient
                            .get()
                            .uri(TOKENINFO_URL + "?id_token={token}", credential)
                            .retrieve()
                            .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            if (claims == null) throw invalid("empty tokeninfo response");
            return claims;
        } catch (HttpClientErrorException e) {
            // tokeninfo answers 400 for a token with a bad signature, a wrong format or past
            // expiry.
            throw invalid("tokeninfo rejected the token (" + e.getStatusCode().value() + ")");
        } catch (RestClientException e) {
            // 5xx, timeouts, connection failures and unreadable bodies: Google's side, not the
            // user's.
            log.warn("Google tokeninfo unavailable: {}", e.getClass().getSimpleName());
            throw SystemException.serviceUnavailable(UNAVAILABLE_MESSAGE, UNAVAILABLE_CODE);
        }
    }

    GoogleIdentity checkClaims(Map<String, Object> claims) {
        String aud = text(claims.get("aud"));
        if (aud == null || !clientIds.contains(aud)) throw invalid("audience mismatch");

        String iss = text(claims.get("iss"));
        if (iss == null || !ISSUERS.contains(iss)) throw invalid("issuer mismatch");

        Long exp = number(claims.get("exp"));
        if (exp == null || clock.instant().getEpochSecond() >= exp) throw invalid("expired");

        if (!isTrue(claims.get("email_verified"))) throw invalid("email not verified");

        String email = text(claims.get("email"));
        if (email == null || !email.contains("@")) throw invalid("missing email");

        String sub = text(claims.get("sub"));
        if (sub == null) throw invalid("missing subject");

        return new GoogleIdentity(sub, email.toLowerCase(Locale.ROOT), text(claims.get("name")));
    }

    private static SystemException invalid(String reason) {
        log.debug("Google ID token rejected: {}", reason);
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

    /** tokeninfo sends {@code "true"} as a string; a JSON boolean is accepted as well. */
    private static boolean isTrue(Object value) {
        return Boolean.TRUE.equals(value) || "true".equalsIgnoreCase(text(value));
    }
}
