package com.uav.platform.dto.response;

import com.uav.platform.enums.*;
import com.uav.platform.enums.MissionEventType;
import com.uav.platform.enums.MissionStatus;

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
