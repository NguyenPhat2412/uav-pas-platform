package com.uav.platform.dto.response.mission;

import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.mission.MissionEventType;
import com.uav.platform.enums.mission.MissionStatus;

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
