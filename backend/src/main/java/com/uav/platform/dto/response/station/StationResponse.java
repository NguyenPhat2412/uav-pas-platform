package com.uav.platform.dto.response.station;

import com.uav.platform.enums.station.*;
import com.uav.platform.enums.station.StationStatus;

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
