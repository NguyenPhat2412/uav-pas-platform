package com.uav.platform.modules.mission.dto.request;

import com.uav.platform.modules.mission.enums.*;
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

    public boolean isEmpty() {
        return status == null
                && missionType == null
                && stationId == null
                && operatorId == null
                && customerId == null
                && requestedDate == null
                && (search == null || search.isBlank());
    }
}
