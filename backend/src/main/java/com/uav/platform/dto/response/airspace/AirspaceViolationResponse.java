package com.uav.platform.dto.response.airspace;

import com.uav.platform.enums.airspace.AirspaceZoneType;

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
