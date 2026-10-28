package com.uav.platform.modules.auth.enums;

/**
 * Public auth operations that are throttled, with how many attempts one account (email or login
 * name) and one client IP may make inside the sliding window.
 */
public enum AuthRateLimitAction {
    /** Password check; may also email a 2FA code. */
    LOGIN(10, 40),
    /** Anything that emails a code: register-otp, resend-otp, forgot-password. */
    OTP_ISSUE(5, 20),
    /** Anything that checks a code: verify-email, verify-2fa, reset-password. */
    OTP_VERIFY(10, 40);

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
