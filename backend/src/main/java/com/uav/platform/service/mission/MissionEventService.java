package com.uav.platform.service.mission;

import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.mission.MissionEventType;
import com.uav.platform.enums.mission.MissionStatus;

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
