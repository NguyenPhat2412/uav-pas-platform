package com.uav.platform.security;

import com.uav.platform.enums.permission.PermissionCode;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.permission.PermissionRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.impl.user.UserAccountServiceImpl;
import com.uav.platform.service.permission.PermissionService;

import jakarta.persistence.EntityManager;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

import java.util.List;

/** Serializes changes affecting recovery permissions, regardless of role labels. */
@Service
public class AccessRecoveryGuard {
    private final PermissionRepository catalog;
    private final UserRepository users;
    private final ObjectProvider<PermissionService> permissions;
    private final EntityManager entityManager;

    public AccessRecoveryGuard(
            PermissionRepository catalog,
            UserRepository users,
            ObjectProvider<PermissionService> permissions,
            EntityManager entityManager) {
        this.catalog = catalog;
        this.users = users;
        this.permissions = permissions;
        this.entityManager = entityManager;
    }

    public long begin() {
        catalog.findByCodeForUpdate(PermissionCode.PERMISSION_MANAGE)
                .orElseThrow(
                        () -> SystemException.conflict("Permission catalog is not initialized"));
        return countManagers();
    }

    public void finish(long before) {
        entityManager.flush();
        if (before > 0 && countManagers() == 0)
            throw SystemException.conflict(
                    "LAST_ACCESS_MANAGER: retain an active account with USER_MANAGE and PERMISSION_MANAGE");
    }

    private long countManagers() {
        PermissionService service = permissions.getObject();
        return users.findAll().stream()
                .filter(
                        u -> {
                            if (!UserAccountServiceImpl.isEnabled(u)
                                    || !UserAccountServiceImpl.isAccountNonLocked(u)) return false;
                            var auth =
                                    UsernamePasswordAuthenticationToken.authenticated(
                                            u.getUsername(), null, List.of());
                            return service.has(auth, "PERMISSION_MANAGE")
                                    && service.has(auth, "USER_MANAGE");
                        })
                .count();
    }
}
