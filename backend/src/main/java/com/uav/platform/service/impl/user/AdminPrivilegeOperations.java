package com.uav.platform.service.impl.user;

import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.permission.PermissionService;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;

/**
 * USER_MANAGE lets staff run ordinary accounts. Anything that grants, removes or takes over
 * administrator power (assigning ROLE_ADMIN, changing one's own role, resetting or locking an
 * administrator) additionally needs an administrator: ROLE_ADMIN or the PERMISSION_MANAGE grant.
 */
public final class AdminPrivilegeOperations {

    public static final String CODE = "USER_ADMIN_PRIVILEGE_REQUIRED";

    private AdminPrivilegeOperations() {}

    public static boolean isAdministrator(
            String actor, UserRepository users, PermissionService permissions) {
        if (actor == null || actor.isBlank() || users == null) return false;
        AppUser account = users.findByUsername(actor).orElse(null);
        if (account == null
                || !UserAccountServiceImpl.isEnabled(account)
                || !UserAccountServiceImpl.isAccountNonLocked(account)) return false;
        if (account.getRole() == UserRole.ROLE_ADMIN) return true;
        return permissions != null
                && permissions.has(
                        UsernamePasswordAuthenticationToken.authenticated(actor, null, List.of()),
                        "PERMISSION_MANAGE");
    }

    public static void requireAdministrator(
            String actor, UserRepository users, PermissionService permissions, String message) {
        if (!isAdministrator(actor, users, permissions))
            throw SystemException.forbidden(message, CODE);
    }

    public static boolean isAdmin(AppUser user) {
        return user != null && user.getRole() == UserRole.ROLE_ADMIN;
    }
}
