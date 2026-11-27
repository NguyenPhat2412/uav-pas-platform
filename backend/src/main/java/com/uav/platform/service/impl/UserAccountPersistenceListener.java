package com.uav.platform.service.impl;

import com.uav.platform.entity.AppUser;

import jakarta.persistence.PrePersist;

/** Applies service defaults to repository inserts that do not use the user factory. */
public class UserAccountPersistenceListener {
    @PrePersist
    public void beforePersist(AppUser user) {
        UserAccountServiceImpl.normalizeDefaults(user);
    }
}
