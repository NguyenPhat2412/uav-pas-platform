package com.uav.platform.dto.response;

import com.uav.platform.enums.*;
import com.uav.platform.enums.StationStatus;

import java.time.LocalDateTime;

public record StationResponse(
        Long id,
        String code,
        String name,
        String address,
        Double latitude,
        Double longitude,
        StationStatus status,
        String description,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
