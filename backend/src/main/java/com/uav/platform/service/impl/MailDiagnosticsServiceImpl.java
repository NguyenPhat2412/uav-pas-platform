package com.uav.platform.service.impl;

import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.record.MailConnectionCheck;
import com.uav.platform.dto.response.EmailStatusResponse;
import com.uav.platform.dto.response.EmailTestResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.AuthMailService;
import com.uav.platform.service.MailDiagnosticsService;
import com.uav.platform.service.MailOtpSettingsService;

import jakarta.annotation.PreDestroy;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Reports mail configuration without exposing SMTP host or credentials, probes the SMTP connection for the health
 * page, and sends a test message only to the calling admin's own address. Uses the same JavaMailSender, enable flag
 * and sender address as {@link AuthMailService}.
 */
@Service
@Slf4j
public class MailDiagnosticsServiceImpl implements MailDiagnosticsService {
    static final Duration TEST_COOLDOWN = Duration.ofMinutes(1);
    static final Duration CONNECTION_CACHE = Duration.ofMinutes(5);
    static final Duration CONNECTION_TIMEOUT = Duration.ofSeconds(8);

    private final AuthMailService authMail;
    private final ObjectProvider<JavaMailSender> senderProvider;
    private final IUserDao users;
    private final String fromAddress;
    private final String host;
    private final String username;
    private final Integer port;
    private final Clock clock;
    private final Map<String, Instant> lastTestByAdmin = new ConcurrentHashMap<>();
    private final ExecutorService probeExecutor =
            Executors.newSingleThreadExecutor(
                    runnable -> {
                        Thread thread = new Thread(runnable, "mail-health-probe");
                        thread.setDaemon(true);
                        return thread;
                    });
    private volatile MailConnectionCheck cachedConnection;

    @Autowired(required = false)
    private ObjectProvider<MailOtpSettingsService> mailOtpSettingsProvider;

    @Autowired
    public MailDiagnosticsServiceImpl(
            AuthMailService authMail,
            ObjectProvider<JavaMailSender> senderProvider,
            IUserDao users,
            @Value("${app.mail.from:no-reply@uav.all1.vn}") String fromAddress,
            @Value("${spring.mail.host:}") String host,
            @Value("${spring.mail.username:}") String username,
            @Value("${spring.mail.port:#{null}}") Integer port) {
        this(authMail, senderProvider, users, fromAddress, host, username, port, Clock.systemUTC());
    }

    MailDiagnosticsServiceImpl(
            AuthMailService authMail,
            ObjectProvider<JavaMailSender> senderProvider,
            IUserDao users,
            String fromAddress,
            String host,
            String username,
            Integer port,
            Clock clock) {
        this.authMail = authMail;
        this.senderProvider = senderProvider;
        this.users = users;
        this.fromAddress = fromAddress;
        this.host = host;
        this.username = username;
        this.port = port;
        this.clock = clock;
    }

    public void setMailOtpSettingsProvider(
            ObjectProvider<MailOtpSettingsService> mailOtpSettingsProvider) {
        this.mailOtpSettingsProvider = mailOtpSettingsProvider;
    }

    @PreDestroy
    void shutdown() {
        probeExecutor.shutdownNow();
    }

    @Override
    public void invalidateConnectionCache() {
        this.cachedConnection = null;
    }

    private MailOtpSettingsService dynamicSettings() {
        return mailOtpSettingsProvider == null ? null : mailOtpSettingsProvider.getIfAvailable();
    }

    private JavaMailSender effectiveSender() {
        MailOtpSettingsService settings = dynamicSettings();
        if (settings != null) {
            return settings.currentMailSender();
        }
        return senderProvider == null ? null : senderProvider.getIfAvailable();
    }

    private String effectiveHost() {
        MailOtpSettingsService settings = dynamicSettings();
        return settings != null ? settings.effectiveSmtpHost() : host;
    }

    private String effectiveUsername() {
        MailOtpSettingsService settings = dynamicSettings();
        return settings != null ? settings.effectiveSmtpUsername() : username;
    }

    private Integer effectivePort() {
        MailOtpSettingsService settings = dynamicSettings();
        return settings != null ? settings.effectiveSmtpPort() : port;
    }

    private String effectiveFromAddress() {
        MailOtpSettingsService settings = dynamicSettings();
        return settings != null ? settings.effectiveFromAddress() : fromAddress;
    }

    private String effectiveDisplayName() {
        MailOtpSettingsService settings = dynamicSettings();
        return settings != null ? settings.effectiveSenderDisplayName() : null;
    }

    private boolean effectiveEnabled() {
        MailOtpSettingsService settings = dynamicSettings();
        if (settings != null) {
            return settings.isMailEnabled() && effectiveSender() != null;
        }
        return authMail.isMailEnabled();
    }

    @Override
    public EmailStatusResponse status(Authentication authentication) {
        AppUser admin = currentAdmin(authentication);
        String resolvedHost = effectiveHost();
        String resolvedUsername = effectiveUsername();
        return new EmailStatusResponse(
                effectiveEnabled(),
                effectiveSender() != null,
                // The property default is "localhost", which only reaches a developer's mail
                // catcher.
                StringUtils.hasText(resolvedHost)
                        && !"localhost".equalsIgnoreCase(resolvedHost.trim()),
                StringUtils.hasText(resolvedUsername),
                effectivePort(),
                effectiveFromAddress(),
                admin == null ? null : AuthMailService.maskEmail(admin.getEmail()),
                TEST_COOLDOWN.toSeconds(),
                connection());
    }

    @Override
    public EmailTestResponse sendTest(Authentication authentication) {
        if (!effectiveEnabled())
            throw SystemException.conflict("Outbound email is disabled", "INFRA_MAIL_DISABLED");
        AppUser admin = currentAdmin(authentication);
        if (admin == null || !StringUtils.hasText(admin.getEmail()))
            throw SystemException.badRequest(
                    "Your account has no email address", "INFRA_ADMIN_EMAIL_MISSING");
        Instant now = clock.instant();
        String key = authentication.getName();
        if (!tryAcquire(key, now))
            throw new SystemException(
                    "Please wait before sending another test email",
                    HttpStatus.TOO_MANY_REQUESTS,
                    "INFRA_MAIL_TEST_RATE_LIMITED");
        String masked = AuthMailService.maskEmail(admin.getEmail());
        try {
            JavaMailSender sender = effectiveSender();
            if (sender == null && senderProvider != null) {
                sender = senderProvider.getObject();
            }
            if (sender == null) {
                throw SystemException.conflict("Outbound email is disabled", "INFRA_MAIL_DISABLED");
            }
            MimeMessage message = sender.createMimeMessage();
            if (message == null) {
                message = new MimeMessage(Session.getInstance(new Properties()));
            }
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            String from = effectiveFromAddress();
            String displayName = effectiveDisplayName();
            if (StringUtils.hasText(displayName)) {
                helper.setFrom(from, displayName);
            } else {
                helper.setFrom(from);
            }
            helper.setTo(admin.getEmail().trim());
            helper.setSubject("[UAV PAS] Email kiểm tra cấu hình / Test email");
            helper.setText(body(now), false);
            sender.send(message);
            log.info("Infrastructure test email sent to {}", masked);
            return new EmailTestResponse(true, null, masked, now);
        } catch (SystemException ex) {
            throw ex;
        } catch (Exception failure) {
            log.warn("Infrastructure test email failed: {}", failure.getClass().getSimpleName());
            return new EmailTestResponse(false, failure.getClass().getSimpleName(), masked, now);
        }
    }

    /** One test per admin per cooldown window; atomic so double clicks cannot both pass. */
    boolean tryAcquire(String key, Instant now) {
        boolean[] acquired = {false};
        lastTestByAdmin.compute(
                key,
                (k, previous) -> {
                    if (previous != null && previous.plus(TEST_COOLDOWN).isAfter(now))
                        return previous;
                    acquired[0] = true;
                    return now;
                });
        return acquired[0];
    }

    @Override
    public MailConnectionCheck connection() {
        Instant now = clock.instant();
        if (!effectiveEnabled()) return new MailConnectionCheck("DISABLED", now, null);
        MailConnectionCheck snapshot = cachedConnection;
        if (snapshot != null && snapshot.checkedAt().plus(CONNECTION_CACHE).isAfter(now))
            return snapshot;
        synchronized (this) {
            snapshot = cachedConnection;
            if (snapshot != null && snapshot.checkedAt().plus(CONNECTION_CACHE).isAfter(now))
                return snapshot;
            cachedConnection = probe(now);
            return cachedConnection;
        }
    }

    private MailConnectionCheck probe(Instant now) {
        JavaMailSender sender = effectiveSender();
        if (!(sender instanceof JavaMailSenderImpl impl))
            return new MailConnectionCheck("UNKNOWN", now, null);
        // testConnection() has no timeout of its own unless mail.smtp.*timeout is set, so bound it
        // here.
        Future<?> attempt =
                probeExecutor.submit(
                        () -> {
                            impl.testConnection();
                            return null;
                        });
        try {
            attempt.get(CONNECTION_TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
            return new MailConnectionCheck("UP", now, null);
        } catch (TimeoutException slow) {
            attempt.cancel(true);
            return new MailConnectionCheck("DOWN", now, "TimeoutException");
        } catch (java.util.concurrent.ExecutionException failed) {
            Throwable cause = failed.getCause() == null ? failed : failed.getCause();
            return new MailConnectionCheck("DOWN", now, cause.getClass().getSimpleName());
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return new MailConnectionCheck("UNKNOWN", now, "InterruptedException");
        }
    }

    private AppUser currentAdmin(Authentication authentication) {
        if (authentication == null || !StringUtils.hasText(authentication.getName())) return null;
        String name = authentication.getName();
        return users.findByUsername(name).or(() -> users.findByEmail(name)).orElse(null);
    }

    private static String body(Instant now) {
        String time =
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss xxx")
                        .format(now.atZone(ZoneId.systemDefault()));
        return """
                Đây là email kiểm tra cấu hình gửi thư của hệ thống UAV PAS.
                Nếu bạn nhận được email này, máy chủ gửi thư đang hoạt động.

                This is a test message from the UAV PAS admin portal (Infrastructure > Email).
                If it reached you, outbound email is working.

                Thời điểm gửi / Sent at: %s
                """
                .formatted(time);
    }
}
