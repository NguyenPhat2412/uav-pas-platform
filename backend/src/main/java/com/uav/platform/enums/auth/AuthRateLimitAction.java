package com.uav.platform.enums.auth;

/**
 * Public auth operations that are throttled, with how many attempts one account (email or login
 * name) and one client IP may make inside the sliding window.
 */
public enum AuthRateLimitAction {
    /** Password check; may also email a 2FA code. */
    LOGIN(8, 25),
    /** Anything that emails a code: register-otp, login email challenge, resend-otp, forgot-password, 2fa/setup. */
    OTP_ISSUE(3, 8),
    /** Anything that checks a code: verify-email, verify-2fa, reset-password. */
    OTP_VERIFY(10, 30);

    private final int perAccount;
    private final int perClient;

    AuthRateLimitAction(int perAccount, int perClient) {
        this.perAccount = perAccount;
        this.perClient = perClient;
    }

    public int perAccount() {
        return perAccount;
    }

    public int perClient() {
        return perClient;
    }
}
