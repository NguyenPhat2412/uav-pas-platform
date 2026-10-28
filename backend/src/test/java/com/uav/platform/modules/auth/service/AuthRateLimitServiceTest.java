package com.uav.platform.modules.auth.service;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.enums.AuthRateLimitAction;
import com.uav.platform.modules.auth.service.impl.AuthRateLimitServiceImpl;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

class AuthRateLimitServiceTest {

    /** Clock the test can move forward. */
    static final class MutableClock extends Clock {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }

        void advance(Duration d) {
            now = now.plus(d);
        }
    }

    final MutableClock clock = new MutableClock();
    final AuthRateLimitServiceImpl limiter = new AuthRateLimitServiceImpl(true, clock);

    private static SystemException limited(Runnable r) {
        SystemException e = assertThrows(SystemException.class, r::run);
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, e.getStatus());
        return e;
    }

    @Test
    void accountLimitBlocksTheSixthCodeRequestInFifteenMinutes() {
        for (int i = 0; i < 5; i++)
            limiter.checkAccount(AuthRateLimitAction.OTP_ISSUE, "Victim@X.vn");
        SystemException e =
                limited(() -> limiter.checkAccount(AuthRateLimitAction.OTP_ISSUE, "victim@x.vn"));
        assertEquals(AuthRateLimitServiceImpl.CODE_RATE_LIMITED, e.getCode());
        // Another account and another action have their own windows.
        limiter.checkAccount(AuthRateLimitAction.OTP_ISSUE, "other@x.vn");
        limiter.checkAccount(AuthRateLimitAction.OTP_VERIFY, "victim@x.vn");
    }

    @Test
    void windowSlidesOpenAgain() {
        for (int i = 0; i < 5; i++) limiter.checkAccount(AuthRateLimitAction.OTP_ISSUE, "a@x.vn");
        clock.advance(Duration.ofMinutes(14));
        limited(() -> limiter.checkAccount(AuthRateLimitAction.OTP_ISSUE, "a@x.vn"));
        clock.advance(Duration.ofMinutes(1).plusSeconds(1));
        limiter.checkAccount(AuthRateLimitAction.OTP_ISSUE, "a@x.vn");
    }

    @Test
    void clientLimitCountsEveryAccountFromOneAddress() {
        for (int i = 0; i < 20; i++)
            limiter.checkClient(AuthRateLimitAction.OTP_ISSUE, "203.0.113.7");
        limited(() -> limiter.checkClient(AuthRateLimitAction.OTP_ISSUE, "203.0.113.7"));
        limiter.checkClient(AuthRateLimitAction.OTP_ISSUE, "203.0.113.8");
    }

    @Test
    void verifyAttemptsAreLimitedPerAccount() {
        for (int i = 0; i < 10; i++) limiter.checkAccount(AuthRateLimitAction.OTP_VERIFY, "a@x.vn");
        limited(() -> limiter.checkAccount(AuthRateLimitAction.OTP_VERIFY, "a@x.vn"));
    }

    @Test
    void resendCooldownLastsSixtySeconds() {
        limiter.checkResendCooldown("LOGIN_2FA|a@x.vn");
        limiter.startResendCooldown("LOGIN_2FA|a@x.vn");
        SystemException e = limited(() -> limiter.checkResendCooldown("LOGIN_2FA|A@x.vn"));
        assertEquals(AuthRateLimitServiceImpl.CODE_RESEND_COOLDOWN, e.getCode());
        clock.advance(Duration.ofSeconds(59));
        limited(() -> limiter.checkResendCooldown("LOGIN_2FA|a@x.vn"));
        clock.advance(Duration.ofSeconds(1));
        limiter.checkResendCooldown("LOGIN_2FA|a@x.vn");
    }

    @Test
    void disabledLimiterAndBlankKeysNeverThrow() {
        var off = new AuthRateLimitServiceImpl(false, clock);
        for (int i = 0; i < 100; i++) {
            off.checkAccount(AuthRateLimitAction.OTP_ISSUE, "a@x.vn");
            limiter.checkClient(AuthRateLimitAction.OTP_ISSUE, null);
            limiter.checkAccount(AuthRateLimitAction.OTP_ISSUE, " ");
        }
        off.startResendCooldown("k");
        off.checkResendCooldown("k");
    }

    @Test
    void concurrentAttemptsNeverExceedTheLimit() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger allowed = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < 64; i++) {
            futures.add(
                    pool.submit(
                            () -> {
                                start.await();
                                try {
                                    limiter.checkAccount(AuthRateLimitAction.LOGIN, "race@x.vn");
                                    allowed.incrementAndGet();
                                } catch (SystemException ignored) {
                                    // limited
                                }
                                return null;
                            }));
        }
        start.countDown();
        for (Future<?> f : futures) f.get(10, TimeUnit.SECONDS);
        pool.shutdown();
        assertEquals(AuthRateLimitAction.LOGIN.perAccount(), allowed.get());
    }

    @Test
    void purgeDropsExpiredWindows() {
        limiter.checkAccount(AuthRateLimitAction.OTP_ISSUE, "a@x.vn");
        limiter.startResendCooldown("k");
        clock.advance(Duration.ofMinutes(16));
        limiter.purgeExpired();
        for (int i = 0; i < 5; i++) limiter.checkAccount(AuthRateLimitAction.OTP_ISSUE, "a@x.vn");
        limiter.checkResendCooldown("k");
    }
}
