package com.uav.platform.dto.response;

import com.uav.platform.enums.*;

public record MissionAvailabilityResponse(
        boolean available,
        boolean stationAvailable,
        boolean uavAvailable,
        boolean operatorAvailable,
        String message) {}
