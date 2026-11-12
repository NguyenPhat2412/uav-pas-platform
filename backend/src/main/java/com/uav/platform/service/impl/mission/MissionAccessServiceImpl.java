package com.uav.platform.service.impl.mission;

import com.uav.platform.entity.mission.*;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.mission.MissionAccessService;
import com.uav.platform.service.permission.PermissionService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/**
 * Resolves mission ownership and locks before a workflow reads or mutates it.
 */
@Service
@RequiredArgsConstructor
public class MissionAccessServiceImpl implements MissionAccessService {
    private final jakarta.persistence.EntityManager entityManager;
    private final MissionRepository missions;
    private final UserRepository users;
    private final PermissionService permissions;

    @Override
    public java.util.List<AppUser> dispatchers() {
        // shortcut: scans staff roles only, so a ROLE_PILOT user granted MISSION_CONFIRM by a
        // per-user override is missed; query user_permissions if that is ever used.
        return java.util.stream.Stream.of(
                        com.uav.platform.enums.user.UserRole.ROLE_ADMIN,
                        com.uav.platform.enums.user.UserRole.ROLE_COMMANDER,
                        com.uav.platform.enums.user.UserRole.ROLE_OPERATOR)
                .flatMap(role -> users.findByRole(role).stream())
                .filter(
                        user ->
                                permissions.has(
                                        org.springframework.security.authentication
                                                .UsernamePasswordAuthenticationToken.authenticated(
                                                        user.getUsername(),
                                                        null,
                                                        java.util.List.of()),
                                        "MISSION_CONFIRM"))
                .toList();
    }

    @Override
    public Mission accessibleForUpdate(Long id, Authentication authentication) {
        Mission mission =
                missions.findByIdForUpdate(id)
                        .orElseThrow(() -> SystemException.notFound("MISSION_NOT_FOUND"));
        if (entityManager != null) entityManager.refresh(mission);
        enforceVisibility(mission, authentication);
        return mission;
    }

    @Override
    public Mission accessible(Long id, Authentication authentication) {
        Mission mission = find(id);
        enforceVisibility(mission, authentication);
        return mission;
    }

    @Override
    public void requireAssignedOperator(Mission mission, Authentication authentication) {
        if (mission.getOperator() == null
                || authentication == null
                || !mission.getOperator().getUsername().equals(authentication.getName())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Assigned operator required");
        }
    }

    @Override
    public void enforceVisibility(Mission mission, Authentication authentication) {
        if (permissions.has(authentication, "MISSION_VIEW_ALL")) return;
        if (authentication == null
                || !authentication.isAuthenticated()
                || (!isCustomerOrOperator(mission, authentication.getName()))) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Mission is not visible to this user");
        }
    }

    @Override
    public boolean isCustomerOrOperator(Mission mission, String username) {
        return (mission.getCustomer() != null
                        && mission.getCustomer().getUsername().equals(username))
                || (mission.getOperator() != null
                        && mission.getOperator().getUsername().equals(username));
    }

    @Override
    public void requirePermitEditor(Mission mission, Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || (!isCustomerOrOperator(mission, authentication.getName())
                        && !permissions.has(authentication, "MISSION_CONFIRM")
                        && !permissions.has(authentication, "USER_MANAGE"))) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Flight permit update requires mission owner, assigned operator, or commander permission");
        }
    }

    @Override
    public void requirePermitVerifier(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || (!permissions.has(authentication, "MISSION_CONFIRM")
                        && !permissions.has(authentication, "USER_MANAGE"))) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Flight permit verification requires MISSION_CONFIRM permission");
        }
    }

    @Override
    public boolean hasAuthority(Authentication authentication, String permissionCode) {
        return authentication != null
                && authentication.isAuthenticated()
                && (permissions.has(authentication, permissionCode)
                        || permissions.has(authentication, "USER_MANAGE"));
    }

    @Override
    public Mission find(Long id) {
        return missions.findById(id)
                .orElseThrow(() -> SystemException.notFound("MISSION_NOT_FOUND"));
    }

    @Override
    public AppUser user(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> SystemException.notFound("User not found"));
    }
}
