package com.uav.platform.dto.response.uav;

import com.uav.platform.enums.uav.*;
import com.uav.platform.enums.uav.UavStatus;

import java.time.LocalDateTime;

public record UavResponse(
        Long id,
        String model,
        String serialNumber,
        String manufacturer,
        UavStatus status,
        Long stationId,
        String stationName,
        LocalDateTime lastMaintenanceAt,
        LocalDateTime createdAt) {}
