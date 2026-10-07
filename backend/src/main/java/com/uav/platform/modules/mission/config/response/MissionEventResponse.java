package com.uav.platform.modules.mission.config.response;

import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.common.MissionEventType;
import com.uav.platform.modules.mission.common.MissionStatus;

import java.time.LocalDateTime;

public record MissionEventResponse(Long id, MissionEventType eventType, String actor, MissionStatus oldStatus,
                                   MissionStatus newStatus, String description, String metadata, LocalDateTime createdAt) { }
