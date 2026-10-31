package com.uav.platform.dto.response.sar;

import com.uav.platform.enums.sar.SarStatus;

import java.time.LocalDateTime;

/** One SAR mission as the cockpit needs it: the search datum plus who and what is flying it. */
public record SarCockpitMissionResponse(
        Long sarId,
        Long missionId,
        String missionCode,
        String missionTitle,
        String missionStatus,
        String priority,
        SarStatus sarStatus,
        double lkpLatitude,
        double lkpLongitude,
        Double driftRadiusMeters,
        String searchAreaPolygon,
        Integer victimCountEstimated,
        String emergencyContact,
        Long uavId,
        String uavModel,
        String uavSerialNumber,
        String operatorName,
        String stationName,
        Double stationLatitude,
        Double stationLongitude,
        LocalDateTime startTime,
        LocalDateTime updatedAt) {}
