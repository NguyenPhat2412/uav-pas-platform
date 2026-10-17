package com.uav.platform.modules.uav.dto.response;

import com.uav.platform.modules.uav.enums.*;
import com.uav.platform.modules.uav.enums.UavStatus;

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
