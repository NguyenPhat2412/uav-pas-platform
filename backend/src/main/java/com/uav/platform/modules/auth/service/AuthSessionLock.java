package com.uav.platform.modules.auth.service;

import com.uav.platform.modules.user.entity.AppUser;

import java.util.Optional;

/** Uses an existing, stable parent row even when no refresh-token row exists yet. */
public interface AuthSessionLock {
    AppUser lock(AppUser user);

    Optional<AppUser> lockById(Long id);
}
