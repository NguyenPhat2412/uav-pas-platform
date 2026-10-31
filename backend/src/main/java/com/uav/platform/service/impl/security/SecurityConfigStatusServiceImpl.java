package com.uav.platform.service.impl.security;

import com.uav.platform.dto.record.security.SecretSpec;
import com.uav.platform.dto.response.security.AiProviderKeyStatusResponse;
import com.uav.platform.dto.response.security.SecretStatusResponse;
import com.uav.platform.dto.response.security.SecretsOverviewResponse;
import com.uav.platform.dto.response.security.SecurityPolicyResponse;
import com.uav.platform.dto.response.security.SecurityWarningResponse;
import com.uav.platform.entity.assistant.AiRouterSettings;
import com.uav.platform.repository.assistant.AiRouterSettingsRepository;
import com.uav.platform.security.jwt.JwtTokenProvider;
import com.uav.platform.service.security.SecurityConfigStatusService;

import lombok.RequiredArgsConstructor;

import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Reports the authentication policy and secret health. Secret values are read only to compute
 * booleans inside this class; they are never returned, logged or included in messages.
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SecurityConfigStatusServiceImpl implements SecurityConfigStatusService {

    static final String MANAGED_IN = "deploy/.env.production";
    static final String CRITICAL = "CRITICAL";
    static final String WARNING = "WARNING";
    static final String INFO = "INFO";

    private static final long DAY_MS = 86_400_000L;
    private static final Set<String> PRODUCTION_PROFILES = Set.of("prod", "production", "live");

    /**
     * Values shipped in application.properties, compose files, .env examples and test config.
     * Compared case-insensitively; never exposed.
     */
    private static final Set<String> KNOWN_DEFAULTS =
            Set.of(
                    "minioadmin",
                    "change-me-minio",
                    "change-me-local",
                    "postgres",
                    "password",
                    "secret",
                    "admin",
                    "changeme",
                    "change-me",
                    "test-access",
                    "test-secret",
                    "test-only-secret-change-me-32-bytes-minimum");

    private static final List<String> PLACEHOLDER_PREFIXES =
            List.of("replace-with", "change-me", "changeme", "your-");

    private final Environment env;
    private final JwtTokenProvider jwtTokenProvider;
    private final AiRouterSettingsRepository aiRouterSettings;

    static final List<SecretSpec> SECRETS =
            List.of(
                    new SecretSpec("app.jwt.secret", "APP_JWT_SECRET", 32, "jwt"),
                    new SecretSpec(
                            "app.billing.ipn-secret", "APP_BILLING_IPN_SECRET", 32, "billingIpn"),
                    new SecretSpec("app.ai-router.secret", "APP_AI_ROUTER_SECRET", 32, "aiRouter"),
                    new SecretSpec(
                            "app.storage.access-key", "APP_STORAGE_ACCESS_KEY", 16, "storage"),
                    new SecretSpec(
                            "app.storage.secret-key", "APP_STORAGE_SECRET_KEY", 24, "storage"),
                    new SecretSpec("spring.mail.password", "SMTP_PASSWORD", 8, "mail"),
                    new SecretSpec(
                            "spring.datasource.password", "POSTGRES_PASSWORD", 16, "database"));

    @Override
    public SecurityPolicyResponse policy() {
        boolean otpDevPreview = bool("app.auth.otp-dev-preview", false);
        boolean cookieSecure = bool("app.cookie.secure", false);
        String sameSite = text("app.cookie.same-site", "Lax");
        String cookieDomain = text("app.cookie.domain", "");
        List<String> origins = origins();
        boolean mailEnabled = bool("app.mail.enabled", false);
        List<String> profiles = Arrays.asList(env.getActiveProfiles());
        boolean prodLike = productionLike(profiles, cookieDomain, origins);
        long accessMs = jwtTokenProvider.getExpirationMs();
        long refreshMs = jwtTokenProvider.getRefreshExpirationMs();

        List<SecurityWarningResponse> warnings = new ArrayList<>();
        if (otpDevPreview)
            warnings.add(warn("OTP_DEV_PREVIEW_ENABLED", CRITICAL, "app.auth.otp-dev-preview"));
        if ("none".equalsIgnoreCase(sameSite) && !cookieSecure)
            warnings.add(warn("COOKIE_SAMESITE_NONE_INSECURE", CRITICAL, "app.cookie.same-site"));
        if (!cookieSecure)
            warnings.add(
                    warn("COOKIE_NOT_SECURE", prodLike ? CRITICAL : WARNING, "app.cookie.secure"));
        if (origins.stream().anyMatch(o -> o.contains("*")))
            warnings.add(warn("CORS_WILDCARD", CRITICAL, "app.cors.allowed-origins"));
        if (origins.stream().anyMatch(SecurityConfigStatusServiceImpl::isLocalOrigin))
            warnings.add(
                    warn("CORS_LOCALHOST", prodLike ? WARNING : INFO, "app.cors.allowed-origins"));
        if (origins.stream().anyMatch(o -> o.startsWith("http://") && !isLocalOrigin(o)))
            warnings.add(warn("CORS_PLAIN_HTTP", WARNING, "app.cors.allowed-origins"));
        if (!mailEnabled)
            warnings.add(warn("MAIL_DISABLED", otpDevPreview ? INFO : WARNING, "app.mail.enabled"));
        if (accessMs > DAY_MS)
            warnings.add(warn("ACCESS_TOKEN_LONG_LIVED", WARNING, "app.jwt.expiration-ms"));
        if (refreshMs > 30 * DAY_MS)
            warnings.add(
                    warn("REFRESH_TOKEN_LONG_LIVED", WARNING, "app.jwt.refresh-expiration-ms"));
        if (!prodLike) warnings.add(warn("NOT_PRODUCTION_PROFILE", INFO, "spring.profiles.active"));

        return new SecurityPolicyResponse(
                accessMs,
                refreshMs,
                integer("app.auth.otp-ttl-minutes", 10),
                text("app.auth.totp-issuer", "VJU UAV-PAS"),
                otpDevPreview,
                cookieSecure,
                sameSite,
                cookieDomain.isBlank() ? null : cookieDomain,
                origins,
                mailEnabled,
                profiles,
                prodLike,
                warnings);
    }

    @Override
    public SecretsOverviewResponse secrets() {
        List<SecretStatusResponse> statuses = new ArrayList<>();
        List<SecurityWarningResponse> warnings = new ArrayList<>();
        for (SecretSpec spec : SECRETS) {
            SecretStatusResponse status = evaluate(spec, env.getProperty(spec.property()));
            statuses.add(status);
            switch (status.status()) {
                case "MISSING" -> warnings.add(warn("SECRET_MISSING", CRITICAL, spec.property()));
                case "KNOWN_DEFAULT" ->
                        warnings.add(warn("SECRET_KNOWN_DEFAULT", CRITICAL, spec.property()));
                case "TOO_SHORT" ->
                        warnings.add(warn("SECRET_TOO_SHORT", WARNING, spec.property()));
                default -> {}
            }
        }
        AiProviderKeyStatusResponse aiKey =
                aiRouterSettings
                        .findById(AiRouterSettings.SINGLETON_ID)
                        .map(
                                s ->
                                        new AiProviderKeyStatusResponse(
                                                s.getApiKeyCipher() != null
                                                        && !s.getApiKeyCipher().isBlank(),
                                                s.getUpdatedAt(),
                                                s.getUpdatedBy()))
                        .orElse(new AiProviderKeyStatusResponse(false, null, null));
        return new SecretsOverviewResponse(List.copyOf(statuses), aiKey, List.copyOf(warnings));
    }

    SecretStatusResponse evaluate(SecretSpec spec, String value) {
        boolean configured = value != null && !value.isBlank();
        int length = configured ? value.getBytes(StandardCharsets.UTF_8).length : 0;
        boolean longEnough = configured && length >= spec.minLength();
        boolean knownDefault = configured && isKnownDefault(value);
        boolean required = isRequired(spec.property());
        String note = note(spec.property(), configured);
        String status;
        if (!configured) status = required ? "MISSING" : "NOT_REQUIRED";
        else if (knownDefault) status = "KNOWN_DEFAULT";
        else if (!longEnough) status = "TOO_SHORT";
        else status = "OK";
        return new SecretStatusResponse(
                spec.property(),
                spec.envVar(),
                required,
                configured,
                spec.minLength(),
                longEnough,
                knownDefault,
                status,
                note,
                MANAGED_IN,
                spec.rotationKey());
    }

    private boolean isRequired(String property) {
        return switch (property) {
            case "app.jwt.secret", "spring.datasource.password" -> true;
            case "app.billing.ipn-secret" -> bool("app.billing.provider-enabled", false);
            case "app.storage.access-key", "app.storage.secret-key" ->
                    !"test".equalsIgnoreCase(text("app.storage.provider", "minio"));
            case "spring.mail.password" ->
                    bool("app.mail.enabled", false)
                            && bool("spring.mail.properties.mail.smtp.auth", false);
            default -> false;
        };
    }

    private static String note(String property, boolean configured) {
        if ("app.ai-router.secret".equals(property) && !configured)
            return "DERIVED_FROM_JWT_SECRET";
        if ("app.billing.ipn-secret".equals(property) && !configured)
            return "REQUIRED_WHEN_BILLING_PROVIDER_ENABLED";
        if ("spring.mail.password".equals(property) && !configured)
            return "REQUIRED_WHEN_SMTP_AUTH_ENABLED";
        return null;
    }

    static boolean isKnownDefault(String value) {
        String v = value.trim().toLowerCase(Locale.ROOT);
        if (KNOWN_DEFAULTS.contains(v)) return true;
        for (String prefix : PLACEHOLDER_PREFIXES) if (v.startsWith(prefix)) return true;
        return false;
    }

    static boolean productionLike(
            List<String> profiles, String cookieDomain, List<String> origins) {
        if (profiles.stream()
                .map(p -> p.toLowerCase(Locale.ROOT))
                .anyMatch(PRODUCTION_PROFILES::contains)) return true;
        if (cookieDomain != null && !cookieDomain.isBlank()) return true;
        return origins.stream().anyMatch(o -> o.startsWith("https://") && !isLocalOrigin(o));
    }

    static boolean isLocalOrigin(String origin) {
        String o = origin.toLowerCase(Locale.ROOT);
        return o.contains("://localhost")
                || o.contains("://127.0.0.1")
                || o.contains("://[::1]")
                || o.contains("://0.0.0.0");
    }

    private List<String> origins() {
        String raw = text("app.cors.allowed-origins", "http://localhost:3000");
        return Arrays.stream(raw.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    private static SecurityWarningResponse warn(String code, String severity, String subject) {
        return new SecurityWarningResponse(code, severity, subject);
    }

    private boolean bool(String key, boolean fallback) {
        return Boolean.parseBoolean(text(key, String.valueOf(fallback)).trim());
    }

    private int integer(String key, int fallback) {
        try {
            return Integer.parseInt(text(key, String.valueOf(fallback)).trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private String text(String key, String fallback) {
        String v = env.getProperty(key);
        return v == null ? fallback : v;
    }
}
