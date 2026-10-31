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
 * Sliding-window counters kept in memory, one window per (action, scope, key). Limits apply per
 * backend instance; they bound brute force and email flooding without extra infrastructure.
 */
@Service
public class AuthRateLimitServiceImpl implements AuthRateLimitService {

    public static final String CODE_RATE_LIMITED = "AUTH_RATE_LIMITED";
    public static final String CODE_RESEND_COOLDOWN = "AUTH_OTP_RESEND_COOLDOWN";

    static final Duration WINDOW = Duration.ofMinutes(15);
    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    private final Map<String, Long> cooldowns = new ConcurrentHashMap<>();
    private final boolean enabled;
    private final Clock clock;

    @Autowired
    public AuthRateLimitServiceImpl(@Value("${app.auth.rate-limit.enabled:true}") boolean enabled) {
        this(enabled, Clock.systemUTC());
    }

    public AuthRateLimitServiceImpl(boolean enabled, Clock clock) {
        this.enabled = enabled;
        this.clock = clock;
    }

    @Override
    public void checkClient(AuthRateLimitAction action, String clientIp) {
        consume(action.name() + "|ip|" + normalize(clientIp), clientIp, action.perClient());
    }

    @Override
    public void checkAccount(AuthRateLimitAction action, String accountKey) {
        consume(action.name() + "|acct|" + normalize(accountKey), accountKey, action.perAccount());
    }

    @Override
    public void checkResendCooldown(String key) {
        if (!enabled || blank(key)) return;
        Long last = cooldowns.get(normalize(key));
        if (last == null) return;
        long waitMs = last + RESEND_COOLDOWN.toMillis() - clock.millis();
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

    private void consume(String bucket, String rawKey, int limit) {
        if (!enabled || blank(rawKey) || limit <= 0) return;
        long now = clock.millis();
        long windowStart = now - WINDOW.toMillis();
        Deque<Long> times = hits.computeIfAbsent(bucket, k -> new ArrayDeque<>());
        long retryAt;
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst() <= windowStart) times.pollFirst();
            if (times.size() < limit) {
                times.addLast(now);
                return;
            }
            retryAt = times.peekFirst() + WINDOW.toMillis();
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
        cooldowns.values().removeIf(t -> t + RESEND_COOLDOWN.toMillis() <= now);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
