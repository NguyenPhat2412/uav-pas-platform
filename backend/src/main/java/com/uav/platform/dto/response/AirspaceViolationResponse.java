package com.uav.platform.dto.response;

import com.uav.platform.enums.AirspaceZoneType;

public record AirspaceViolationResponse(
        Long zoneId,
        String code,
        String name,
        AirspaceZoneType zoneType,
        String authority,
        Integer maxAltitudeAglM,
        double distanceMeters,
        boolean blocking,
        boolean requiresPermit,
        String message) {}
