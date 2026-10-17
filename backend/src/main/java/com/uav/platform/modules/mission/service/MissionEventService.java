package com.uav.platform.modules.mission.service;

import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.enums.MissionEventType;
import com.uav.platform.modules.mission.enums.MissionStatus;
import com.uav.platform.modules.user.entity.AppUser;

import org.springframework.security.core.Authentication;

/** Records timeline events and sends the existing best-effort party notifications. */
public interface MissionEventService {
    void record(
            Mission mission,
            MissionEventType type,
            Authentication authentication,
            MissionStatus oldStatus,
            MissionStatus newStatus,
            String description);

    void notifyParties(
            Mission mission, Authentication actor, MissionEventType type, String description);

    void notifyUser(
            AppUser recipient,
            String actorName,
            Mission mission,
            MissionEventType type,
            String description);
}
