package com.uav.platform.modules.station.dto.response;

import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.station.enums.StationStatus;

import java.time.LocalDateTime;

public record StationResponse(
        Long id,
        String code,
        String name,
        String address,
        Double latitude,
        Double longitude,
        StationStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
