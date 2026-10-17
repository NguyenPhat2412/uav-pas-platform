package com.uav.platform.modules.mission.dto.record;

import com.uav.platform.modules.mission.enums.MissionStatus;
import com.uav.platform.modules.mission.enums.MissionType;

import java.time.LocalDate;

public record MissionFilter(
        MissionStatus status,
        MissionType missionType,
        Long stationId,
        Long operatorId,
        Long customerId,
        LocalDate requestedDate,
        String search) {
    public static MissionFilter empty() {
        return new MissionFilter(null, null, null, null, null, null, null);
    }
}
