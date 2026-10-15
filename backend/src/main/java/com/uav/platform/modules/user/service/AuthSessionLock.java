package com.uav.platform.modules.user.service;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

/** Uses an existing, stable parent row even when no refresh-token row exists yet. */
@Service @Transactional(propagation = Propagation.MANDATORY)
public class AuthSessionLock {
    private final UserRepository users;
    private final EntityManager entityManager;
    public AuthSessionLock(UserRepository users, EntityManager entityManager) {
        this.users = users; this.entityManager = entityManager;
    }
    public AppUser lock(AppUser user) {
        return lockById(user.getId()).orElseThrow(() -> SystemException.unauthorized("User no longer exists"));
    }
    public Optional<AppUser> lockById(Long id) {
        if (id == null) return Optional.empty();
        var user = users.findByIdForUpdate(id);
        // A login may have resolved the account before waiting for another login.
        user.ifPresent(entityManager::refresh);
        return user;
    }
}
