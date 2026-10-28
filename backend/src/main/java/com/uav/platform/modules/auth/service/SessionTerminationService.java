package com.uav.platform.modules.auth.service;

import com.uav.platform.modules.user.entity.AppUser;

/**
 * Ends every session of an account after a credential or access change (password reset/change,
 * lock): refresh tokens are revoked, access tokens issued up to now stop authenticating (same
 * cut-off as the admin "revoke sessions" action) and pending login 2FA challenges are cancelled.
 */
public interface SessionTerminationService {

    /** Returns how many refresh tokens were revoked. */
    int terminateAll(AppUser user, String actor);
}
