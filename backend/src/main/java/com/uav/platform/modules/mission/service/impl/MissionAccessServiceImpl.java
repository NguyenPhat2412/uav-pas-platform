package com.uav.platform.modules.mission.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.service.MissionAccessService;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;

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
