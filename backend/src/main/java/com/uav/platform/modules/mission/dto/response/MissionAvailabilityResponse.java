package com.uav.platform.modules.mission.dto.response;

import com.uav.platform.modules.mission.enums.*;

public record MissionAvailabilityResponse(
        boolean available,
        boolean stationAvailable,
        boolean uavAvailable,
        boolean operatorAvailable,
        String message) {}
