package com.uav.platform.service.mission;

import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.user.AppUser;

import org.springframework.security.core.Authentication;

/** Resolves mission ownership and locks before a workflow reads or mutates it. */
public interface MissionAccessService {
    Mission accessibleForUpdate(Long id, Authentication authentication);

    Mission accessible(Long id, Authentication authentication);

    void requireAssignedOperator(Mission mission, Authentication authentication);

    void enforceVisibility(Mission mission, Authentication authentication);

    boolean isCustomerOrOperator(Mission mission, String username);

    Mission find(Long id);

    AppUser user(String username);
}
