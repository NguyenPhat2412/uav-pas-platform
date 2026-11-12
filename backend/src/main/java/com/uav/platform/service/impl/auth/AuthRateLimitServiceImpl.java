package com.uav.platform.service.impl.auth;

import com.uav.platform.enums.auth.AuthRateLimitAction;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.auth.AuthRateLimitService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Sliding-window counters kept in memory, one window per (action, scope, key) plus a system-wide
 * 1-minute outbound email budget to protect SMTP sender reputation.
 */
@Service
public class AuthRateLimitServiceImpl implements AuthRateLimitService {

    public static final String CODE_RATE_LIMITED = "AUTH_RATE_LIMITED";
    public static final String CODE_RESEND_COOLDOWN = "AUTH_OTP_RESEND_COOLDOWN";

    static final Duration WINDOW = Duration.ofMinutes(15);
    static final Duration EMAIL_BUDGET_WINDOW = Duration.ofMinutes(1);
    private static final String GLOBAL_EMAIL_BUCKET = "GLOBAL|smtp|minute";
    private static final String SIGNED_IN_EMAIL_BUCKET = "GLOBAL|smtp|minute|signed-in";
    public static final int DEFAULT_SIGNED_IN_EMAILS_PER_MINUTE = 60;

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final Map<String, Long> cooldowns = new ConcurrentHashMap<>();
    private final boolean enabled;
    private final int otpPerAccount;
    private final int otpPerClient;
    private final int maxEmailsPerMinute;
    private final int maxSignedInEmailsPerMinute;
    private final Duration resendCooldown;
    private final Clock clock;

    @Autowired
    public AuthRateLimitServiceImpl(
            @Value("${app.auth.rate-limit.enabled:true}") boolean enabled,
            @Value("${app.auth.rate-limit.otp-per-account:3}") int otpPerAccount,
            @Value("${app.auth.rate-limit.otp-per-ip:8}") int otpPerClient,
            @Value("${app.auth.rate-limit.max-emails-per-minute:15}") int maxEmailsPerMinute,
            @Value("${app.auth.rate-limit.resend-cooldown-seconds:60}") int resendCooldownSeconds,
            @Value("${app.auth.rate-limit.max-signed-in-emails-per-minute:60}")
                    int maxSignedInEmailsPerMinute) {
        this(
                enabled,
                otpPerAccount,
                otpPerClient,
                maxEmailsPerMinute,
                resendCooldownSeconds,
                maxSignedInEmailsPerMinute,
                Clock.systemUTC());
    }

    public AuthRateLimitServiceImpl(boolean enabled, Clock clock) {
        this(
                enabled,
                AuthRateLimitAction.OTP_ISSUE.perAccount(),
                AuthRateLimitAction.OTP_ISSUE.perClient(),
                15,
                60,
                clock);
    }

    public AuthRateLimitServiceImpl(
            boolean enabled,
            int otpPerAccount,
            int otpPerClient,
            int maxEmailsPerMinute,
            int resendCooldownSeconds,
            Clock clock) {
        this(
                enabled,
                otpPerAccount,
                otpPerClient,
                maxEmailsPerMinute,
                resendCooldownSeconds,
                DEFAULT_SIGNED_IN_EMAILS_PER_MINUTE,
                clock);
    }

    public AuthRateLimitServiceImpl(
            boolean enabled,
            int otpPerAccount,
            int otpPerClient,
            int maxEmailsPerMinute,
            int resendCooldownSeconds,
            int maxSignedInEmailsPerMinute,
            Clock clock) {
        this.enabled = enabled;
        this.maxSignedInEmailsPerMinute =
                maxSignedInEmailsPerMinute > 0
                        ? maxSignedInEmailsPerMinute
                        : DEFAULT_SIGNED_IN_EMAILS_PER_MINUTE;
        this.otpPerAccount =
                otpPerAccount > 0 ? otpPerAccount : AuthRateLimitAction.OTP_ISSUE.perAccount();
        this.otpPerClient =
                otpPerClient > 0 ? otpPerClient : AuthRateLimitAction.OTP_ISSUE.perClient();
        this.maxEmailsPerMinute = maxEmailsPerMinute > 0 ? maxEmailsPerMinute : 15;
        this.resendCooldown =
                Duration.ofSeconds(resendCooldownSeconds > 0 ? resendCooldownSeconds : 60);
        this.clock = clock;
    }

    @Override
    public void checkClient(AuthRateLimitAction action, String clientIp) {
        int limit = action == AuthRateLimitAction.OTP_ISSUE ? otpPerClient : action.perClient();
        consume(action.name() + "|ip|" + normalize(clientIp), clientIp, limit, WINDOW);
    }

    @Override
    public void checkAccount(AuthRateLimitAction action, String accountKey) {
        int limit = action == AuthRateLimitAction.OTP_ISSUE ? otpPerAccount : action.perAccount();
        consume(action.name() + "|acct|" + normalize(accountKey), accountKey, limit, WINDOW);
    }

    @Override
    public void checkGlobalEmailBudget(boolean signedIn) {
        int budget = signedIn ? maxSignedInEmailsPerMinute : maxEmailsPerMinute;
        if (!enabled || budget <= 0) return;
        long now = clock.millis();
        long windowStart = now - EMAIL_BUDGET_WINDOW.toMillis();
        Deque<Long> times =
                hits.computeIfAbsent(
                        signedIn ? SIGNED_IN_EMAIL_BUCKET : GLOBAL_EMAIL_BUCKET,
                        k -> new ArrayDeque<>());
        long retryAt;
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst() <= windowStart) times.pollFirst();
            if (times.size() < budget) {
                times.addLast(now);
                return;
            }
            retryAt = times.peekFirst() + EMAIL_BUDGET_WINDOW.toMillis();
        }
        long seconds = Math.max(1, (retryAt - now + 999) / 1000);
        throw new SystemException(
                "Hệ thống gửi email xác thực đang tạm thời quá tải. Vui lòng thử lại sau "
                        + seconds
                        + " giây.",
                HttpStatus.TOO_MANY_REQUESTS,
                CODE_RATE_LIMITED);
    }

    @Override
    public void checkResendCooldown(String key) {
        if (!enabled || blank(key)) return;
        Long last = cooldowns.get(normalize(key));
        if (last == null) return;
        long waitMs = last + resendCooldown.toMillis() - clock.millis();
        if (waitMs > 0) {
            long seconds = Math.max(1, (waitMs + 999) / 1000);
            throw new SystemException(
                    "Vui lòng đợi " + seconds + " giây trước khi yêu cầu gửi lại mã OTP.",
                    HttpStatus.TOO_MANY_REQUESTS,
                    CODE_RESEND_COOLDOWN);
        }
    }

    @Override
    public void startResendCooldown(String key) {
        if (!enabled || blank(key)) return;
        cooldowns.put(normalize(key), clock.millis());
    }

    private void consume(String bucket, String rawKey, int limit, Duration window) {
        if (!enabled || blank(rawKey) || limit <= 0) return;
        long now = clock.millis();
        long windowStart = now - window.toMillis();
        Deque<Long> times = hits.computeIfAbsent(bucket, k -> new ArrayDeque<>());
        long retryAt;
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst() <= windowStart) times.pollFirst();
            if (times.size() < limit) {
                times.addLast(now);
                return;
            }
            retryAt = times.peekFirst() + window.toMillis();
        }
        long minutes = Math.max(1, (retryAt - now + 59_999) / 60_000);
        throw new SystemException(
                "Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau " + minutes + " phút.",
                HttpStatus.TOO_MANY_REQUESTS,
                CODE_RATE_LIMITED);
    }

    /** Drops windows and cooldowns that no longer hold anything, so memory stays bounded. */
    @Scheduled(fixedDelay = 600_000L, initialDelay = 600_000L)
    public void purgeExpired() {
        long now = clock.millis();
        long windowStart = now - WINDOW.toMillis();
        hits.entrySet()
                .removeIf(
                        e -> {
                            Deque<Long> times = e.getValue();
                            synchronized (times) {
                                while (!times.isEmpty() && times.peekFirst() <= windowStart)
                                    times.pollFirst();
                                return times.isEmpty();
                            }
                        });
        cooldowns.values().removeIf(t -> t + resendCooldown.toMillis() <= now);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
