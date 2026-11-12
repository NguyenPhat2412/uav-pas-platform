package com.uav.platform.dto.response.mission;

import com.uav.platform.enums.mission.*;

public record MissionAvailabilityResponse(
        boolean available,
        boolean stationAvailable,
        boolean uavAvailable,
        boolean operatorAvailable,
        String message) {}
