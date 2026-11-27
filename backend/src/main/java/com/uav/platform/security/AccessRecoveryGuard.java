package com.uav.platform.security;

import com.uav.platform.dao.IPermissionDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.enums.PermissionCode;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.PermissionService;
import com.uav.platform.service.impl.UserAccountServiceImpl;

import jakarta.persistence.EntityManager;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

import java.util.List;

/** Serializes changes affecting recovery permissions, regardless of role labels. */
@Service
public class AccessRecoveryGuard {
    private final IPermissionDao catalog;
    private final IUserDao users;
    private final ObjectProvider<PermissionService> permissions;
    private final EntityManager entityManager;

    public AccessRecoveryGuard(
            IPermissionDao catalog,
            IUserDao users,
            ObjectProvider<PermissionService> permissions,
            EntityManager entityManager) {
        this.catalog = catalog;
        this.users = users;
        this.permissions = permissions;
        this.entityManager = entityManager;
    }

    public long begin() {
        catalog.findByCodeForUpdate(PermissionCode.USER_PERMISSION_MANAGE)
                .orElseThrow(
                        () -> SystemException.conflict("Permission catalog is not initialized"));
        return countManagers();
    }

    public void finish(long before) {
        entityManager.flush();
        if (before > 0 && countManagers() == 0)
            throw SystemException.conflict(
                    "LAST_ACCESS_MANAGER: retain an active account with USER_MANAGE and USER_PERMISSION_MANAGE");
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
                            return service.has(auth, "USER_PERMISSION_MANAGE")
                                    && service.has(auth, "USER_MANAGE");
                        })
                .count();
    }
}
