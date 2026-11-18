package com.uav.platform.service.impl.infrastructure;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.AesGcmCipher;
import com.uav.platform.common.util.Hashing;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.dto.record.infrastructure.MailConnectionCheck;
import com.uav.platform.dto.request.auth.verification.ForgotPasswordRequest;
import com.uav.platform.dto.request.infrastructure.AdminOtpSupportRequest;
import com.uav.platform.dto.request.infrastructure.MailOtpSettingsUpdateRequest;
import com.uav.platform.dto.response.infrastructure.AdminOtpSupportResponse;
import com.uav.platform.dto.response.infrastructure.AdminOtpTokenResponse;
import com.uav.platform.dto.response.infrastructure.MailOtpSettingsResponse;
import com.uav.platform.entity.auth.AuthOtpToken;
import com.uav.platform.entity.infrastructure.MailOtpSettings;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.auth.AuthOtpTokenRepository;
import com.uav.platform.repository.infrastructure.MailOtpSettingsRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.auth.session.AuthRateLimitService;
import com.uav.platform.service.auth.verification.AuthMailService;
import com.uav.platform.service.auth.verification.AuthOtpService;
import com.uav.platform.service.infrastructure.MailDiagnosticsService;
import com.uav.platform.service.infrastructure.MailOtpSettingsService;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Properties;

@Service
@Slf4j
public class MailOtpSettingsServiceImpl implements MailOtpSettingsService {

    public static final int DEFAULT_MAX_OTP_ATTEMPTS = 5;
    private static final Duration CACHE_TTL = Duration.ofSeconds(10);
    private static final String SMTP_TIMEOUT_MS = "10000";

    private final MailOtpSettingsRepository repository;
    private final AuthOtpTokenRepository otpTokenRepository;
    private final UserRepository userRepository;
    private final ObjectProvider<JavaMailSender> defaultMailSenderProvider;
    private final ObjectProvider<MailDiagnosticsService> mailDiagnosticsProvider;
    private final ObjectProvider<AuthOtpService> authOtpProvider;
    private final ObjectProvider<AuthRateLimitService> rateLimitProvider;
    private final AuditLogService auditLogService;
    private final AesGcmCipher cipher;

    private final boolean envMailEnabled;
    private final String envSmtpHost;
    private final Integer envSmtpPort;
    private final String envSmtpUsername;
    private final String envSmtpPassword;
    private final String envFromAddress;
    private final boolean envSmtpAuth;
    private final boolean envSmtpStarttls;
    private final int envOtpTtlMinutes;
    private final int envResendCooldownSeconds;
    private final int envOtpPerAccount;
    private final int envOtpPerIp;
    private final int envMaxEmailsPerMinute;

    private volatile CachedRow cachedRow;
    private volatile CachedMailSender cachedCustomSender;

    private static final class CachedRow {
        final MailOtpSettings row;
        final Instant loadedAt;

        CachedRow(MailOtpSettings row, Instant loadedAt) {
            this.row = row;
            this.loadedAt = loadedAt;
        }
    }

    private static final class CachedMailSender {
        final String fingerprint;
        final JavaMailSenderImpl sender;

        CachedMailSender(String fingerprint, JavaMailSenderImpl sender) {
            this.fingerprint = fingerprint;
            this.sender = sender;
        }
    }

    @Autowired
    public MailOtpSettingsServiceImpl(
            MailOtpSettingsRepository repository,
            AuthOtpTokenRepository otpTokenRepository,
            UserRepository userRepository,
            @Autowired(required = false) ObjectProvider<JavaMailSender> defaultMailSenderProvider,
            @Autowired(required = false)
                    ObjectProvider<MailDiagnosticsService> mailDiagnosticsProvider,
            @Autowired(required = false) ObjectProvider<AuthOtpService> authOtpProvider,
            @Autowired(required = false) ObjectProvider<AuthRateLimitService> rateLimitProvider,
            @Autowired(required = false) AuditLogService auditLogService,
            @Value("${app.jwt.secret}") String jwtSecret,
            @Value("${app.mail.enabled:false}") boolean envMailEnabled,
            @Value("${spring.mail.host:localhost}") String envSmtpHost,
            @Value("${spring.mail.port:1025}") Integer envSmtpPort,
            @Value("${spring.mail.username:}") String envSmtpUsername,
            @Value("${spring.mail.password:}") String envSmtpPassword,
            @Value("${app.mail.from:no-reply@uav.all1.vn}") String envFromAddress,
            @Value("${spring.mail.properties.mail.smtp.auth:false}") boolean envSmtpAuth,
            @Value("${spring.mail.properties.mail.smtp.starttls.enable:false}")
                    boolean envSmtpStarttls,
            @Value("${app.auth.otp-ttl-minutes:10}") int envOtpTtlMinutes,
            @Value("${app.auth.rate-limit.resend-cooldown-seconds:60}")
                    int envResendCooldownSeconds,
            @Value("${app.auth.rate-limit.otp-per-account:3}") int envOtpPerAccount,
            @Value("${app.auth.rate-limit.otp-per-ip:8}") int envOtpPerIp,
            @Value("${app.auth.rate-limit.max-emails-per-minute:15}") int envMaxEmailsPerMinute) {
        if (!StringUtils.hasText(jwtSecret)) {
            throw new IllegalStateException("Secret key material is required");
        }
        this.repository = repository;
        this.otpTokenRepository = otpTokenRepository;
        this.userRepository = userRepository;
        this.defaultMailSenderProvider = defaultMailSenderProvider;
        this.mailDiagnosticsProvider = mailDiagnosticsProvider;
        this.authOtpProvider = authOtpProvider;
        this.rateLimitProvider = rateLimitProvider;
        this.auditLogService = auditLogService;
        this.cipher = new AesGcmCipher(Hashing.sha256("uav-pas/mail-otp/" + jwtSecret));
        this.envMailEnabled = envMailEnabled;
        this.envSmtpHost = trimToNull(envSmtpHost);
        this.envSmtpPort = envSmtpPort;
        this.envSmtpUsername = trimToNull(envSmtpUsername);
        this.envSmtpPassword = trimToNull(envSmtpPassword);
        this.envFromAddress =
                StringUtils.hasText(envFromAddress)
                        ? envFromAddress.trim()
                        : "no-reply@uav.all1.vn";
        this.envSmtpAuth = envSmtpAuth;
        this.envSmtpStarttls = envSmtpStarttls;
        this.envOtpTtlMinutes = envOtpTtlMinutes > 0 ? envOtpTtlMinutes : 10;
        this.envResendCooldownSeconds =
                envResendCooldownSeconds > 0 ? envResendCooldownSeconds : 60;
        this.envOtpPerAccount = envOtpPerAccount > 0 ? envOtpPerAccount : 3;
        this.envOtpPerIp = envOtpPerIp > 0 ? envOtpPerIp : 8;
        this.envMaxEmailsPerMinute = envMaxEmailsPerMinute > 0 ? envMaxEmailsPerMinute : 15;
    }

    private MailOtpSettings currentRow() {
        CachedRow snapshot = cachedRow;
        Instant now = Instant.now();
        if (snapshot != null && snapshot.loadedAt.plus(CACHE_TTL).isAfter(now)) {
            return snapshot.row;
        }
        try {
            MailOtpSettings loaded = repository.findById(MailOtpSettings.SINGLETON_ID).orElse(null);
            cachedRow = new CachedRow(loaded, now);
            return loaded;
        } catch (RuntimeException ex) {
            log.debug("MailOtpSettings DB lookup unavailable, falling back to env defaults");
            return snapshot != null ? snapshot.row : null;
        }
    }

    @Override
    public void invalidateCache() {
        this.cachedRow = null;
        this.cachedCustomSender = null;
        MailDiagnosticsService diagnostics =
                mailDiagnosticsProvider == null ? null : mailDiagnosticsProvider.getIfAvailable();
        if (diagnostics != null) {
            diagnostics.invalidateConnectionCache();
        }
    }

    @Override
    public boolean isMailEnabled() {
        MailOtpSettings row = currentRow();
        return row != null && row.getMailEnabled() != null ? row.getMailEnabled() : envMailEnabled;
    }

    @Override
    public String effectiveSmtpHost() {
        MailOtpSettings row = currentRow();
        return firstNonBlank(row != null ? row.getSmtpHost() : null, envSmtpHost);
    }

    @Override
    public Integer effectiveSmtpPort() {
        MailOtpSettings row = currentRow();
        return row != null && row.getSmtpPort() != null ? row.getSmtpPort() : envSmtpPort;
    }

    @Override
    public String effectiveSmtpUsername() {
        MailOtpSettings row = currentRow();
        return firstNonBlank(row != null ? row.getSmtpUsername() : null, envSmtpUsername);
    }

    @Override
    public String effectiveFromAddress() {
        MailOtpSettings row = currentRow();
        String addr = firstNonBlank(row != null ? row.getFromAddress() : null, envFromAddress);
        return addr != null ? addr : "no-reply@uav.all1.vn";
    }

    @Override
    public String effectiveSenderDisplayName() {
        MailOtpSettings row = currentRow();
        return row != null ? trimToNull(row.getSenderDisplayName()) : null;
    }

    @Override
    public boolean effectiveSmtpAuth() {
        MailOtpSettings row = currentRow();
        return row != null && row.getSmtpAuth() != null ? row.getSmtpAuth() : envSmtpAuth;
    }

    @Override
    public boolean effectiveSmtpStarttls() {
        MailOtpSettings row = currentRow();
        return row != null && row.getSmtpStarttls() != null
                ? row.getSmtpStarttls()
                : envSmtpStarttls;
    }

    @Override
    public int effectiveOtpTtlMinutes() {
        MailOtpSettings row = currentRow();
        return positiveOrDefault(row != null ? row.getOtpTtlMinutes() : null, envOtpTtlMinutes, 10);
    }

    @Override
    public int effectiveResendCooldownSeconds() {
        MailOtpSettings row = currentRow();
        return positiveOrDefault(
                row != null ? row.getResendCooldownSeconds() : null, envResendCooldownSeconds, 60);
    }

    @Override
    public int effectiveMaxOtpAttempts() {
        MailOtpSettings row = currentRow();
        return positiveOrDefault(
                row != null ? row.getMaxOtpAttempts() : null,
                DEFAULT_MAX_OTP_ATTEMPTS,
                DEFAULT_MAX_OTP_ATTEMPTS);
    }

    @Override
    public int effectiveOtpPerAccount() {
        MailOtpSettings row = currentRow();
        return positiveOrDefault(row != null ? row.getOtpPerAccount() : null, envOtpPerAccount, 3);
    }

    @Override
    public int effectiveOtpPerIp() {
        MailOtpSettings row = currentRow();
        return positiveOrDefault(row != null ? row.getOtpPerIp() : null, envOtpPerIp, 8);
    }

    @Override
    public int effectiveMaxEmailsPerMinute() {
        MailOtpSettings row = currentRow();
        return positiveOrDefault(
                row != null ? row.getMaxEmailsPerMinute() : null, envMaxEmailsPerMinute, 15);
    }

    private static boolean hasSmtpTransportOverride(MailOtpSettings row) {
        if (row == null) return false;
        return StringUtils.hasText(row.getSmtpHost())
                || row.getSmtpPort() != null
                || StringUtils.hasText(row.getSmtpUsername())
                || StringUtils.hasText(row.getSmtpPasswordEncrypted())
                || row.getSmtpAuth() != null
                || row.getSmtpStarttls() != null;
    }

    @Override
    public JavaMailSender currentMailSender() {
        MailOtpSettings row = currentRow();
        if (!hasSmtpTransportOverride(row)) {
            return defaultMailSenderProvider == null
                    ? null
                    : defaultMailSenderProvider.getIfAvailable();
        }
        String host = effectiveSmtpHost();
        Integer port = effectiveSmtpPort();
        String username = effectiveSmtpUsername();
        boolean auth = effectiveSmtpAuth();
        boolean starttls = effectiveSmtpStarttls();
        String encryptedPw = row.getSmtpPasswordEncrypted();
        String fingerprint =
                Objects.toString(host, "")
                        + "|"
                        + Objects.toString(port, "")
                        + "|"
                        + Objects.toString(username, "")
                        + "|"
                        + Objects.toString(encryptedPw, "")
                        + "|"
                        + auth
                        + "|"
                        + starttls;

        CachedMailSender existing = cachedCustomSender;
        if (existing != null && fingerprint.equals(existing.fingerprint)) {
            return existing.sender;
        }

        synchronized (this) {
            existing = cachedCustomSender;
            if (existing != null && fingerprint.equals(existing.fingerprint)) {
                return existing.sender;
            }
            JavaMailSenderImpl sender = new JavaMailSenderImpl();
            sender.setDefaultEncoding(StandardCharsets.UTF_8.name());
            if (StringUtils.hasText(host)) {
                sender.setHost(host);
            }
            if (port != null && port > 0) {
                sender.setPort(port);
            }
            if (StringUtils.hasText(username)) {
                sender.setUsername(username);
            }
            String password =
                    StringUtils.hasText(encryptedPw) ? decrypt(encryptedPw) : envSmtpPassword;
            if (StringUtils.hasText(password)) {
                sender.setPassword(password);
            }

            Properties props = sender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", String.valueOf(auth));
            props.put("mail.smtp.starttls.enable", String.valueOf(starttls));
            if (port != null && port == 465) {
                props.put("mail.smtp.ssl.enable", "true");
            }
            props.put("mail.smtp.connectiontimeout", SMTP_TIMEOUT_MS);
            props.put("mail.smtp.timeout", SMTP_TIMEOUT_MS);
            props.put("mail.smtp.writetimeout", SMTP_TIMEOUT_MS);

            cachedCustomSender = new CachedMailSender(fingerprint, sender);
            return sender;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public MailOtpSettingsResponse getSettings() {
        MailOtpSettings row = repository.findById(MailOtpSettings.SINGLETON_ID).orElse(null);
        this.cachedRow = new CachedRow(row, Instant.now());
        return toResponse(row);
    }

    @Override
    @Transactional
    public MailOtpSettingsResponse updateSettings(
            MailOtpSettingsUpdateRequest request, Authentication authentication) {
        if (request == null) {
            throw SystemException.badRequest("Dữ liệu cấu hình không hợp lệ.");
        }
        String actor =
                authentication != null && StringUtils.hasText(authentication.getName())
                        ? authentication.getName()
                        : "admin";

        if (Boolean.TRUE.equals(request.resetToEnvDefaults())) {
            repository.deleteById(MailOtpSettings.SINGLETON_ID);
            repository.flush();
            invalidateCache();
            this.cachedRow = new CachedRow(null, Instant.now());
            recordAudit(
                    authentication,
                    AuditAction.UPDATE,
                    "MAIL_OTP_SETTINGS",
                    "1",
                    "resetToEnvDefaults=true");
            return toResponse(null);
        }

        MailOtpSettings row =
                repository
                        .findById(MailOtpSettings.SINGLETON_ID)
                        .orElseGet(
                                () -> {
                                    MailOtpSettings fresh = new MailOtpSettings();
                                    fresh.setId(MailOtpSettings.SINGLETON_ID);
                                    return fresh;
                                });

        if (request.mailEnabled() != null) {
            row.setMailEnabled(request.mailEnabled());
        }
        if (request.smtpHost() != null) {
            String host = trimToNull(request.smtpHost());
            if (host != null
                    && (host.contains(" ") || host.contains("\r") || host.contains("\n"))) {
                throw SystemException.badRequest(
                                "Tên máy chủ SMTP không được chứa khoảng trắng.",
                                "MAIL_SMTP_HOST_INVALID")
                        .at("smtpHost");
            }
            row.setSmtpHost(host);
        }
        if (request.smtpPort() != null) {
            row.setSmtpPort(request.smtpPort());
        }
        if (request.smtpUsername() != null) {
            String username = trimToNull(request.smtpUsername());
            if (username != null && (username.contains("\r") || username.contains("\n"))) {
                throw SystemException.badRequest(
                                "Tài khoản SMTP không hợp lệ.", "MAIL_SMTP_USERNAME_INVALID")
                        .at("smtpUsername");
            }
            row.setSmtpUsername(username);
        }
        if (request.fromAddress() != null) {
            String from = trimToNull(request.fromAddress());
            if (from != null
                    && (from.contains("\r")
                            || from.contains("\n")
                            || from.contains(" ")
                            || !from.contains("@"))) {
                throw SystemException.badRequest(
                                "Địa chỉ email gửi đi (From) không hợp lệ.", "MAIL_FROM_INVALID")
                        .at("fromAddress");
            }
            row.setFromAddress(from);
        }
        if (request.senderDisplayName() != null) {
            String displayName = trimToNull(request.senderDisplayName());
            if (displayName != null) {
                displayName = displayName.replace("\r", "").replace("\n", " ").trim();
            }
            row.setSenderDisplayName(displayName);
        }

        String effectiveHostForSave = firstNonBlank(row.getSmtpHost(), envSmtpHost);
        boolean gmailHost = isGmailSmtpHost(effectiveHostForSave);

        boolean passwordModified = false;
        if (request.smtpPassword() != null) {
            passwordModified = true;
            String rawPassword = request.smtpPassword().trim();
            if (rawPassword.isEmpty()) {
                row.setSmtpPasswordEncrypted(null);
                row.setSmtpPasswordHint(null);
            } else {
                String cleaned = gmailHost ? rawPassword.replace(" ", "") : rawPassword;
                if (cleaned.isEmpty()) {
                    row.setSmtpPasswordEncrypted(null);
                    row.setSmtpPasswordHint(null);
                } else {
                    row.setSmtpPasswordEncrypted(encrypt(cleaned));
                    row.setSmtpPasswordHint(buildPasswordHint(cleaned));
                }
            }
        }

        if (request.smtpAuth() != null) {
            row.setSmtpAuth(request.smtpAuth());
        } else if (gmailHost
                && row.getSmtpAuth() == null
                && StringUtils.hasText(row.getSmtpPasswordEncrypted())) {
            row.setSmtpAuth(true);
        }

        if (request.smtpStarttls() != null) {
            row.setSmtpStarttls(request.smtpStarttls());
        } else if (gmailHost && row.getSmtpStarttls() == null) {
            row.setSmtpStarttls(true);
        }

        if (gmailHost && request.smtpPort() == null && row.getSmtpPort() == null) {
            row.setSmtpPort(587);
        }

        if (request.otpTtlMinutes() != null) {
            row.setOtpTtlMinutes(request.otpTtlMinutes());
        }
        if (request.resendCooldownSeconds() != null) {
            row.setResendCooldownSeconds(request.resendCooldownSeconds());
        }
        if (request.maxOtpAttempts() != null) {
            row.setMaxOtpAttempts(request.maxOtpAttempts());
        }
        if (request.otpPerAccount() != null) {
            row.setOtpPerAccount(request.otpPerAccount());
        }
        if (request.otpPerIp() != null) {
            row.setOtpPerIp(request.otpPerIp());
        }
        if (request.maxEmailsPerMinute() != null) {
            row.setMaxEmailsPerMinute(request.maxEmailsPerMinute());
        }

        row.setUpdatedAt(LocalDateTime.now());
        row.setUpdatedBy(actor);
        MailOtpSettings saved = repository.saveAndFlush(row);

        invalidateCache();
        this.cachedRow = new CachedRow(saved, Instant.now());

        recordAudit(
                authentication,
                AuditAction.UPDATE,
                "MAIL_OTP_SETTINGS",
                "1",
                "mailEnabled="
                        + (saved.getMailEnabled() != null ? saved.getMailEnabled() : envMailEnabled)
                        + (passwordModified
                                ? ", smtpPassword="
                                        + (saved.getSmtpPasswordEncrypted() == null
                                                ? "cleared"
                                                : "updated")
                                : ""));
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<AdminOtpTokenResponse> listOtpTokens(
            int page, int size, String purpose, String status, String query) {
        LocalDateTime now = LocalDateTime.now();
        int maxAttempts = effectiveMaxOtpAttempts();
        String normPurpose =
                trimToNull(purpose) != null ? purpose.trim().toUpperCase(Locale.ROOT) : null;
        String normStatus =
                trimToNull(status) != null ? status.trim().toUpperCase(Locale.ROOT) : null;
        String normQuery = trimToNull(query) != null ? query.trim().toLowerCase(Locale.ROOT) : null;

        Specification<AuthOtpToken> spec =
                (root, cq, cb) -> {
                    if (cq != null
                            && cq.getResultType() != Long.class
                            && cq.getResultType() != long.class) {
                        root.fetch("user", JoinType.LEFT);
                    }
                    List<Predicate> predicates = new ArrayList<>();
                    if (normPurpose != null) {
                        predicates.add(cb.equal(cb.upper(root.get("purpose")), normPurpose));
                    }
                    if (normStatus != null) {
                        switch (normStatus) {
                            case "CONSUMED" -> predicates.add(cb.isNotNull(root.get("consumedAt")));
                            case "EXPIRED" ->
                                    predicates.add(
                                            cb.and(
                                                    cb.isNull(root.get("consumedAt")),
                                                    cb.lessThan(root.get("expiresAt"), now)));
                            case "LOCKED" ->
                                    predicates.add(
                                            cb.and(
                                                    cb.isNull(root.get("consumedAt")),
                                                    cb.greaterThanOrEqualTo(
                                                            root.get("expiresAt"), now),
                                                    cb.greaterThanOrEqualTo(
                                                            root.get("attempts"), maxAttempts)));
                            case "ACTIVE" ->
                                    predicates.add(
                                            cb.and(
                                                    cb.isNull(root.get("consumedAt")),
                                                    cb.greaterThanOrEqualTo(
                                                            root.get("expiresAt"), now),
                                                    cb.lessThan(
                                                            root.get("attempts"), maxAttempts)));
                            default -> {
                                // Unknown status filter ignored gracefully.
                            }
                        }
                    }
                    if (normQuery != null) {
                        String pattern = "%" + normQuery + "%";
                        Join<AuthOtpToken, AppUser> userJoin = root.join("user", JoinType.LEFT);
                        predicates.add(
                                cb.or(
                                        cb.like(cb.lower(root.get("email")), pattern),
                                        cb.like(cb.lower(userJoin.get("username")), pattern)));
                    }
                    return cb.and(predicates.toArray(Predicate[]::new));
                };

        Page<AuthOtpToken> result =
                otpTokenRepository.findAll(spec, Pageables.desc(page, size, "createdAt"));
        return PageResponse.from(result.map(token -> toOtpTokenResponse(token, now, maxAttempts)));
    }

    @Override
    @Transactional
    public AdminOtpTokenResponse invalidateOtpToken(Long id, Authentication authentication) {
        AuthOtpToken token =
                otpTokenRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy phiên mã OTP.",
                                                "OTP_TOKEN_NOT_FOUND"));
        LocalDateTime now = LocalDateTime.now();
        if (token.getConsumedAt() == null) {
            token.setExpiresAt(now.minusSeconds(1));
            token = otpTokenRepository.saveAndFlush(token);
        }
        recordAudit(
                authentication,
                AuditAction.REVOKE,
                "AUTH_OTP_TOKEN",
                String.valueOf(token.getId()),
                "purpose=" + token.getPurpose());
        return toOtpTokenResponse(token, now, effectiveMaxOtpAttempts());
    }

    @Override
    @Transactional
    public AdminOtpSupportResponse sendPasswordResetSupportOtp(
            AdminOtpSupportRequest request, Authentication authentication) {
        if (request == null || !StringUtils.hasText(request.email())) {
            throw SystemException.badRequest("Vui lòng nhập địa chỉ email.");
        }
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        AppUser user =
                userRepository
                        .findByEmail(normalizedEmail)
                        .or(
                                () ->
                                        userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc(
                                                normalizedEmail))
                        .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));

        AuthRateLimitService limiter =
                rateLimitProvider == null ? null : rateLimitProvider.getIfAvailable();
        if (limiter != null) {
            limiter.clearAccountLimits(normalizedEmail);
            limiter.clearAccountLimits(user.getEmail());
            if (StringUtils.hasText(user.getUsername())) {
                limiter.clearAccountLimits(user.getUsername());
            }
        }

        AuthOtpService otpService =
                authOtpProvider == null ? null : authOtpProvider.getIfAvailable();
        if (otpService == null) {
            throw SystemException.internalError("AuthOtpService is unavailable");
        }
        otpService.forgotPassword(new ForgotPasswordRequest(user.getEmail()), "admin-support");

        recordAudit(
                authentication,
                AuditAction.UPDATE,
                "AUTH_OTP_SUPPORT",
                String.valueOf(user.getId()),
                "action=SEND_PASSWORD_RESET_OTP");
        return new AdminOtpSupportResponse(
                user.getEmail(),
                "SEND_PASSWORD_RESET_OTP",
                "Đã xóa giới hạn tần suất và gửi mã OTP khôi phục mật khẩu gồm 6 chữ số tới "
                        + user.getEmail()
                        + ".",
                LocalDateTime.now());
    }

    @Override
    @Transactional
    public AdminOtpSupportResponse clearAccountRateLimits(
            AdminOtpSupportRequest request, Authentication authentication) {
        if (request == null || !StringUtils.hasText(request.email())) {
            throw SystemException.badRequest("Vui lòng nhập địa chỉ email.");
        }
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        AppUser user =
                userRepository
                        .findByEmail(normalizedEmail)
                        .or(
                                () ->
                                        userRepository.findFirstByEmailIgnoreCaseOrderByIdAsc(
                                                normalizedEmail))
                        .orElse(null);

        AuthRateLimitService limiter =
                rateLimitProvider == null ? null : rateLimitProvider.getIfAvailable();
        if (limiter != null) {
            limiter.clearAccountLimits(normalizedEmail);
            if (user != null) {
                limiter.clearAccountLimits(user.getEmail());
                if (StringUtils.hasText(user.getUsername())) {
                    limiter.clearAccountLimits(user.getUsername());
                }
            }
        }

        recordAudit(
                authentication,
                AuditAction.UPDATE,
                "AUTH_OTP_SUPPORT",
                user != null
                        ? String.valueOf(user.getId())
                        : AuthMailService.maskEmail(normalizedEmail),
                "action=CLEAR_RATE_LIMIT");
        return new AdminOtpSupportResponse(
                user != null ? user.getEmail() : normalizedEmail,
                "CLEAR_RATE_LIMIT",
                "Đã xóa bộ đếm giới hạn OTP và thời gian chờ gửi lại cho " + normalizedEmail + ".",
                LocalDateTime.now());
    }

    private MailOtpSettingsResponse toResponse(MailOtpSettings row) {
        boolean hasDbOverride = row != null;
        boolean effectiveEnabled =
                row != null && row.getMailEnabled() != null ? row.getMailEnabled() : envMailEnabled;
        String host = firstNonBlank(row != null ? row.getSmtpHost() : null, envSmtpHost);
        Integer port = row != null && row.getSmtpPort() != null ? row.getSmtpPort() : envSmtpPort;
        String username =
                firstNonBlank(row != null ? row.getSmtpUsername() : null, envSmtpUsername);
        String from = firstNonBlank(row != null ? row.getFromAddress() : null, envFromAddress);
        if (from == null) {
            from = "no-reply@uav.all1.vn";
        }
        String displayName = row != null ? trimToNull(row.getSenderDisplayName()) : null;
        boolean smtpAuth =
                row != null && row.getSmtpAuth() != null ? row.getSmtpAuth() : envSmtpAuth;
        boolean smtpStarttls =
                row != null && row.getSmtpStarttls() != null
                        ? row.getSmtpStarttls()
                        : envSmtpStarttls;

        boolean passwordConfigured;
        String passwordSource;
        String passwordHint;
        if (row != null && StringUtils.hasText(row.getSmtpPasswordEncrypted())) {
            passwordConfigured = true;
            passwordSource = "DATABASE";
            passwordHint = row.getSmtpPasswordHint();
        } else if (StringUtils.hasText(envSmtpPassword)) {
            passwordConfigured = true;
            passwordSource = "ENV";
            passwordHint = buildPasswordHint(envSmtpPassword);
        } else {
            passwordConfigured = false;
            passwordSource = "NONE";
            passwordHint = null;
        }

        int otpTtl =
                positiveOrDefault(
                        row != null ? row.getOtpTtlMinutes() : null, envOtpTtlMinutes, 10);
        int cooldown =
                positiveOrDefault(
                        row != null ? row.getResendCooldownSeconds() : null,
                        envResendCooldownSeconds,
                        60);
        int maxAttempts =
                positiveOrDefault(
                        row != null ? row.getMaxOtpAttempts() : null,
                        DEFAULT_MAX_OTP_ATTEMPTS,
                        DEFAULT_MAX_OTP_ATTEMPTS);
        int perAcct =
                positiveOrDefault(row != null ? row.getOtpPerAccount() : null, envOtpPerAccount, 3);
        int perIp = positiveOrDefault(row != null ? row.getOtpPerIp() : null, envOtpPerIp, 8);
        int maxPerMin =
                positiveOrDefault(
                        row != null ? row.getMaxEmailsPerMinute() : null,
                        envMaxEmailsPerMinute,
                        15);

        MailDiagnosticsService diagnostics =
                mailDiagnosticsProvider == null ? null : mailDiagnosticsProvider.getIfAvailable();
        MailConnectionCheck connection = diagnostics != null ? diagnostics.connection() : null;

        return new MailOtpSettingsResponse(
                effectiveEnabled,
                host,
                port,
                username,
                from,
                displayName,
                smtpAuth,
                smtpStarttls,
                passwordConfigured,
                passwordSource,
                passwordHint,
                hasDbOverride,
                otpTtl,
                cooldown,
                maxAttempts,
                perAcct,
                perIp,
                maxPerMin,
                row != null ? row.getUpdatedAt() : null,
                row != null ? row.getUpdatedBy() : null,
                connection);
    }

    public static AdminOtpTokenResponse toOtpTokenResponse(
            AuthOtpToken token, LocalDateTime now, int maxAttempts) {
        String derivedStatus;
        if (token.getConsumedAt() != null) {
            derivedStatus = "CONSUMED";
        } else if (token.getExpiresAt() != null && token.getExpiresAt().isBefore(now)) {
            derivedStatus = "EXPIRED";
        } else if (token.getAttempts() >= maxAttempts) {
            derivedStatus = "LOCKED";
        } else {
            derivedStatus = "ACTIVE";
        }
        AppUser owner = token.getUser();
        return new AdminOtpTokenResponse(
                token.getId(),
                owner != null ? owner.getId() : null,
                owner != null ? owner.getUsername() : null,
                token.getEmail(),
                token.getPurpose(),
                token.getAttempts(),
                maxAttempts,
                derivedStatus,
                token.getCreatedAt(),
                token.getExpiresAt(),
                token.getConsumedAt());
    }

    static boolean isGmailSmtpHost(String host) {
        if (!StringUtils.hasText(host)) return false;
        String lower = host.trim().toLowerCase(Locale.ROOT);
        return lower.contains("gmail.com") || lower.contains("googlemail.com");
    }

    static String buildPasswordHint(String secret) {
        if (!StringUtils.hasText(secret)) return null;
        String trimmed = secret.trim();
        String suffix = trimmed.substring(Math.max(0, trimmed.length() - 4));
        return "•••• •••• •••• " + suffix;
    }

    String encrypt(String plain) {
        try {
            return cipher.encrypt(plain);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("SMTP password encryption failed", e);
        }
    }

    String decrypt(String encoded) {
        try {
            return cipher.decrypt(encoded);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("SMTP password decryption failed", e);
        }
    }

    private void recordAudit(
            Authentication auth,
            AuditAction action,
            String entityType,
            String entityId,
            String details) {
        if (auditLogService == null) return;
        Long actorId = null;
        String actorUsername = auth != null ? auth.getName() : "system";
        if (auth != null && StringUtils.hasText(auth.getName())) {
            actorId =
                    userRepository.findByUsername(auth.getName()).map(AppUser::getId).orElse(null);
        }
        auditLogService.record(actorId, actorUsername, action, entityType, entityId, details);
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String firstNonBlank(String primary, String fallback) {
        if (StringUtils.hasText(primary)) return primary.trim();
        if (StringUtils.hasText(fallback)) return fallback.trim();
        return null;
    }

    private static int positiveOrDefault(Integer overrideValue, int envValue, int hardFallback) {
        if (overrideValue != null && overrideValue > 0) return overrideValue;
        return envValue > 0 ? envValue : hardFallback;
    }
}
