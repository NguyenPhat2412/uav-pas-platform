package com.uav.platform.dto.response.sar;

import com.uav.platform.enums.sar.SarStatus;

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
