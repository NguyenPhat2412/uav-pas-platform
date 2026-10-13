package com.uav.platform.modules.sar.config.response;

import com.uav.platform.modules.sar.common.SarStatus;
import java.time.LocalDateTime;

public record SarMissionResponse(
    Long id,
    Long missionId,
    String searchAreaPolygon,
    Double lkpLatitude,
    Double lkpLongitude,
    Double driftRadiusMeters,
    SarStatus sarStatus,
    String emergencyContact,
    Integer victimCountEstimated,
    String notes,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
