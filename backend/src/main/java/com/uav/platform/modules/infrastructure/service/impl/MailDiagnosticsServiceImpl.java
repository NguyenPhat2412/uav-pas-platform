package com.uav.platform.modules.infrastructure.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.service.AuthMailService;
import com.uav.platform.modules.infrastructure.dto.record.MailConnectionCheck;
import com.uav.platform.modules.infrastructure.dto.response.EmailStatusResponse;
import com.uav.platform.modules.infrastructure.dto.response.EmailTestResponse;
import com.uav.platform.modules.infrastructure.service.MailDiagnosticsService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;

import jakarta.annotation.PreDestroy;
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
    private final UserRepository users;
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

    @Autowired
    public MailDiagnosticsServiceImpl(
            AuthMailService authMail,
            ObjectProvider<JavaMailSender> senderProvider,
            UserRepository users,
            @Value("${app.mail.from:no-reply@uav-pas.vju.ac.vn}") String fromAddress,
            @Value("${spring.mail.host:}") String host,
            @Value("${spring.mail.username:}") String username,
            @Value("${spring.mail.port:#{null}}") Integer port) {
        this(authMail, senderProvider, users, fromAddress, host, username, port, Clock.systemUTC());
    }

    MailDiagnosticsServiceImpl(
            AuthMailService authMail,
            ObjectProvider<JavaMailSender> senderProvider,
            UserRepository users,
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

    @PreDestroy
    void shutdown() {
        probeExecutor.shutdownNow();
    }

    @Override
    public EmailStatusResponse status(Authentication authentication) {
        AppUser admin = currentAdmin(authentication);
        return new EmailStatusResponse(
                authMail.isMailEnabled(),
                senderProvider.getIfAvailable() != null,
                // The property default is "localhost", which only reaches a developer's mail
                // catcher.
                StringUtils.hasText(host) && !"localhost".equalsIgnoreCase(host.trim()),
                StringUtils.hasText(username),
                port,
                fromAddress,
                admin == null ? null : AuthMailService.maskEmail(admin.getEmail()),
                TEST_COOLDOWN.toSeconds(),
                connection());
    }

    @Override
    public EmailTestResponse sendTest(Authentication authentication) {
        if (!authMail.isMailEnabled())
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
            JavaMailSender sender = senderProvider.getObject();
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper =
                    new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(admin.getEmail().trim());
            helper.setSubject("[VJU UAV-PAS] Email kiểm tra cấu hình / Test email");
            helper.setText(body(now), false);
            sender.send(message);
            log.info("Infrastructure test email sent to {}", masked);
            return new EmailTestResponse(true, null, masked, now);
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
        if (!authMail.isMailEnabled()) return new MailConnectionCheck("DISABLED", now, null);
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
        JavaMailSender sender = senderProvider.getIfAvailable();
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
                Đây là email kiểm tra cấu hình gửi thư của hệ thống VJU UAV-PAS.
                Nếu bạn nhận được email này, máy chủ gửi thư đang hoạt động.

                This is a test message from the VJU UAV-PAS admin portal (Infrastructure > Email).
                If it reached you, outbound email is working.

                Thời điểm gửi / Sent at: %s
                """
                .formatted(time);
    }
}
