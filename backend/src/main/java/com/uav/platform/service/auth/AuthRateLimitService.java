package com.uav.platform.service.auth;

import com.uav.platform.enums.auth.AuthRateLimitAction;

/**
 * In-memory throttle for the public auth endpoints. Every check counts one attempt and throws a
 * 429 {@code SystemException} (code {@code AUTH_RATE_LIMITED} or {@code AUTH_OTP_RESEND_COOLDOWN})
 * once the limit is reached.
 */
public interface AuthRateLimitService {

    /** Counts an attempt from one client IP. A blank IP is not counted. */
    void checkClient(AuthRateLimitAction action, String clientIp);

    /** Counts an attempt against one account key (email or login name, case-insensitive). */
    void checkAccount(AuthRateLimitAction action, String accountKey);

    /** Rejects a new code for this key while the previous one is younger than the cooldown. */
    void checkResendCooldown(String key);

    /** Starts the resend cooldown for this key (called whenever a code is emailed). */
    void startResendCooldown(String key);

    /** Caps outbound authentication emails per minute across the platform (anonymous flows). */
    default void checkGlobalEmailBudget() {
        checkGlobalEmailBudget(false);
    }

    /**
     * Caps outbound authentication emails per minute across the platform. {@code signedIn} codes
     * (after a correct password or within a session) have a budget of their own, so a distributed
     * flood of anonymous requests cannot stop existing users from receiving their login codes.
     */
    default void checkGlobalEmailBudget(boolean signedIn) {}
}
