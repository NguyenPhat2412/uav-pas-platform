package com.uav.platform.modules.security.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.uav.platform.modules.assistant.entity.AiRouterSettings;
import com.uav.platform.modules.assistant.repository.AiRouterSettingsRepository;
import com.uav.platform.modules.security.dto.response.SecretStatusResponse;
import com.uav.platform.modules.security.dto.response.SecurityWarningResponse;
import com.uav.platform.modules.security.service.impl.SecurityConfigStatusServiceImpl;
import com.uav.platform.security.jwt.JwtTokenProvider;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

class SecurityConfigStatusServiceImplTest {

    private static final String JWT = "Zq8!strong-jwt-secret-value-0123456789-abcdef";
    private static final String IPN = "short-ipn";
    private static final String STORAGE_SECRET = "minioadmin";
    private static final String DB_PASSWORD = "Db-Pass-For-Leak-Test-998877";
    private static final String MAIL_PASSWORD = "mail-pass-leak-check";
    private static final String AI_CIPHER = "cipher-text-must-not-leak";

    private final AiRouterSettingsRepository aiRepo = mock(AiRouterSettingsRepository.class);
    private final JwtTokenProvider jwt = mock(JwtTokenProvider.class);

    private SecurityConfigStatusServiceImpl service(MockEnvironment env) {
        when(jwt.getExpirationMs()).thenReturn(86_400_000L);
        when(jwt.getRefreshExpirationMs()).thenReturn(604_800_000L);
        return new SecurityConfigStatusServiceImpl(env, jwt, aiRepo);
    }

    private MockEnvironment secretsEnv() {
        return new MockEnvironment()
                .withProperty("app.jwt.secret", JWT)
                .withProperty("app.billing.ipn-secret", IPN)
                .withProperty("app.billing.provider-enabled", "true")
                .withProperty("app.storage.access-key", "minioadmin")
                .withProperty("app.storage.secret-key", STORAGE_SECRET)
                .withProperty("spring.mail.password", MAIL_PASSWORD)
                .withProperty("spring.datasource.password", DB_PASSWORD);
    }

    private SecretStatusResponse find(List<SecretStatusResponse> list, String property) {
        return list.stream().filter(s -> s.property().equals(property)).findFirst().orElseThrow();
    }

    @Test
    void secretsReportHealthAndNeverContainValues() throws Exception {
        AiRouterSettings ai = new AiRouterSettings();
        ai.setApiKeyCipher(AI_CIPHER);
        ai.setApiKeyHint("ab12");
        ai.setUpdatedAt(LocalDateTime.of(2026, 10, 1, 9, 0));
        ai.setUpdatedBy("admin");
        when(aiRepo.findById(AiRouterSettings.SINGLETON_ID)).thenReturn(Optional.of(ai));

        var result = service(secretsEnv()).secrets();

        var jwtStatus = find(result.secrets(), "app.jwt.secret");
        assertEquals("OK", jwtStatus.status());
        assertTrue(jwtStatus.configured() && jwtStatus.meetsMinimumLength());
        assertFalse(jwtStatus.usesKnownDefault());

        var ipn = find(result.secrets(), "app.billing.ipn-secret");
        assertTrue(ipn.required());
        assertEquals("TOO_SHORT", ipn.status());

        assertEquals("KNOWN_DEFAULT", find(result.secrets(), "app.storage.secret-key").status());
        assertTrue(find(result.secrets(), "app.storage.access-key").usesKnownDefault());

        var aiSecret = find(result.secrets(), "app.ai-router.secret");
        assertEquals("NOT_REQUIRED", aiSecret.status());
        assertEquals("DERIVED_FROM_JWT_SECRET", aiSecret.note());

        assertTrue(result.aiProviderKey().configured());
        assertEquals("admin", result.aiProviderKey().updatedBy());
        assertTrue(
                result.warnings().stream()
                        .anyMatch(
                                w ->
                                        w.code().equals("SECRET_KNOWN_DEFAULT")
                                                && w.subject().equals("app.storage.secret-key")));

        String json =
                new ObjectMapper().registerModule(new JavaTimeModule()).writeValueAsString(result);
        for (String secret :
                List.of(JWT, IPN, DB_PASSWORD, MAIL_PASSWORD, AI_CIPHER, "ab12", "minioadmin")) {
            assertFalse(json.contains(secret), "secret value leaked into response");
        }
        // Not even a prefix or suffix of a secret.
        assertFalse(json.contains(JWT.substring(0, 6)));
        assertFalse(json.contains(DB_PASSWORD.substring(DB_PASSWORD.length() - 6)));
    }

    @Test
    void missingRequiredSecretIsCritical() {
        when(aiRepo.findById(AiRouterSettings.SINGLETON_ID)).thenReturn(Optional.empty());
        var result = service(new MockEnvironment()).secrets();

        assertEquals("MISSING", find(result.secrets(), "app.jwt.secret").status());
        assertEquals("MISSING", find(result.secrets(), "spring.datasource.password").status());
        assertEquals("NOT_REQUIRED", find(result.secrets(), "app.billing.ipn-secret").status());
        assertEquals("NOT_REQUIRED", find(result.secrets(), "spring.mail.password").status());
        assertFalse(result.aiProviderKey().configured());
        assertTrue(
                result.warnings().stream()
                        .anyMatch(
                                w ->
                                        w.code().equals("SECRET_MISSING")
                                                && w.severity().equals("CRITICAL")));
    }

    @Test
    void placeholderValuesCountAsKnownDefaults() {
        when(aiRepo.findById(AiRouterSettings.SINGLETON_ID)).thenReturn(Optional.empty());
        var env =
                new MockEnvironment()
                        .withProperty(
                                "app.jwt.secret", "replace-with-48-random-bytes-xxxxxxxxxxxxxxxxxx")
                        .withProperty("spring.datasource.password", "change-me-local");
        var result = service(env).secrets();
        assertEquals("KNOWN_DEFAULT", find(result.secrets(), "app.jwt.secret").status());
        assertEquals(
                "KNOWN_DEFAULT", find(result.secrets(), "spring.datasource.password").status());
    }

    @Test
    void policyFlagsUnsafeSettingsInProductionLikeDeployments() {
        var env =
                new MockEnvironment()
                        .withProperty("app.auth.otp-dev-preview", "true")
                        .withProperty("app.cookie.secure", "false")
                        .withProperty("app.cookie.same-site", "None")
                        .withProperty("app.cookie.domain", "uav.example.vn")
                        .withProperty(
                                "app.cors.allowed-origins",
                                "https://uav.example.vn, http://localhost:3000")
                        .withProperty("app.mail.enabled", "false")
                        .withProperty("app.auth.otp-ttl-minutes", "5")
                        .withProperty("app.jwt.secret", JWT);
        env.setActiveProfiles("prod");

        var policy = service(env).policy();

        assertTrue(policy.productionLike());
        assertEquals(
                List.of("https://uav.example.vn", "http://localhost:3000"),
                policy.corsAllowedOrigins());
        assertEquals(5, policy.otpTtlMinutes());
        assertEquals(604_800_000L, policy.refreshTokenExpirationMs());
        List<String> codes = policy.warnings().stream().map(SecurityWarningResponse::code).toList();
        assertTrue(
                codes.containsAll(
                        List.of(
                                "OTP_DEV_PREVIEW_ENABLED",
                                "COOKIE_SAMESITE_NONE_INSECURE",
                                "COOKIE_NOT_SECURE",
                                "CORS_LOCALHOST",
                                "MAIL_DISABLED")));
        assertEquals(
                "CRITICAL",
                policy.warnings().stream()
                        .filter(w -> w.code().equals("COOKIE_NOT_SECURE"))
                        .findFirst()
                        .orElseThrow()
                        .severity());
        assertFalse(policy.toString().contains(JWT));
    }

    @Test
    void hardenedPolicyHasNoCriticalWarnings() {
        var env =
                new MockEnvironment()
                        .withProperty("app.cookie.secure", "true")
                        .withProperty("app.cors.allowed-origins", "https://uav.example.vn")
                        .withProperty("app.mail.enabled", "true");
        var policy = service(env).policy();
        assertTrue(policy.productionLike());
        assertTrue(policy.warnings().isEmpty(), policy.warnings().toString());
    }
}
