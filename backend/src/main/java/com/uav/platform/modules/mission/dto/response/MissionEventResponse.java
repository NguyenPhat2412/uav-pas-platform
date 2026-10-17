package com.uav.platform.modules.mission.dto.response;

import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.enums.MissionEventType;
import com.uav.platform.modules.mission.enums.MissionStatus;

import java.time.LocalDateTime;

public record MissionEventResponse(
        Long id,
        MissionEventType eventType,
        String actor,
        MissionStatus oldStatus,
        MissionStatus newStatus,
        String description,
        String metadata,
        LocalDateTime createdAt) {}
