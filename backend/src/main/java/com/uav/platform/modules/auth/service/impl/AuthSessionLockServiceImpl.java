package com.uav.platform.modules.auth.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.service.AuthSessionLock;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;

import jakarta.persistence.EntityManager;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/** Uses an existing, stable parent row even when no refresh-token row exists yet. */
@Service
@Transactional(propagation = Propagation.MANDATORY)
@RequiredArgsConstructor
public class AuthSessionLockServiceImpl implements AuthSessionLock {
    private final UserRepository users;
    private final EntityManager entityManager;

    @Override
    public AppUser lock(AppUser user) {
        return lockById(user.getId())
                .orElseThrow(() -> SystemException.unauthorized("User no longer exists"));
    }

    @Override
    public Optional<AppUser> lockById(Long id) {
        if (id == null) return Optional.empty();
        var user = users.findByIdForUpdate(id);
        // A login may have resolved the account before waiting for another login.
        user.ifPresent(entityManager::refresh);
        return user;
    }
}
