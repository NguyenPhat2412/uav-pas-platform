package com.uav.platform.dto.response;

import com.uav.platform.enums.SarStatus;

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
        LocalDateTime updatedAt,
        long version) {}
