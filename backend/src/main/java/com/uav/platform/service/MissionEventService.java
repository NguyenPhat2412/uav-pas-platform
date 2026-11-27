package com.uav.platform.service;

import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Mission;
import com.uav.platform.enums.MissionEventType;
import com.uav.platform.enums.MissionStatus;

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

    default boolean deliversNotifications() {
        return false;
    }
}
