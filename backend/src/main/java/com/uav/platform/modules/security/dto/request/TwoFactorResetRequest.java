package com.uav.platform.modules.security.dto.request;

/**
 * Admin reset of a user's 2FA. {@code revokeSessions} defaults to true when omitted: a lost
 * device may also be a stolen one.
 */
public record TwoFactorResetRequest(Boolean revokeSessions) {
    public boolean shouldRevokeSessions() {
        return revokeSessions == null || revokeSessions;
    }
}
