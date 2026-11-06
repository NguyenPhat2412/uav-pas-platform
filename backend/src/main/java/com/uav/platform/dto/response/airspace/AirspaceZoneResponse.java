package com.uav.platform.dto.response.airspace;

import com.uav.platform.enums.airspace.AirspaceGeometryType;
import com.uav.platform.enums.airspace.AirspaceZoneType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record AirspaceZoneResponse(
        Long id,
        String code,
        String name,
        AirspaceZoneType zoneType,
        AirspaceGeometryType geometryType,
        BigDecimal centerLat,
        BigDecimal centerLng,
        Integer radiusMeters,
        List<List<Double>> vertices,
        Integer maxAltitudeAglM,
        String authority,
        boolean active,
        String description,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
