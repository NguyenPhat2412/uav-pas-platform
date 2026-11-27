package com.uav.platform.dto.record;

import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.MissionType;

import java.time.LocalDate;

public record MissionFilter(
        MissionStatus status,
        MissionType missionType,
        Long stationId,
        Long operatorId,
        Long customerId,
        LocalDate requestedDate,
        String search,
        Long projectId,
        Long providerId,
        String statusGroup) {

    public MissionFilter(
            MissionStatus status,
            MissionType missionType,
            Long stationId,
            Long operatorId,
            Long customerId,
            LocalDate requestedDate,
            String search) {
        this(
                status,
                missionType,
                stationId,
                operatorId,
                customerId,
                requestedDate,
                search,
                null,
                null,
                null);
    }

    public static MissionFilter empty() {
        return new MissionFilter(null, null, null, null, null, null, null, null, null, null);
    }
}
