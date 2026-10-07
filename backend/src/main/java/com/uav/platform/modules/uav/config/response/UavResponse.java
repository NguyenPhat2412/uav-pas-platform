package com.uav.platform.modules.uav.config.response;

import com.uav.platform.modules.uav.common.*;

import com.uav.platform.modules.uav.common.UavStatus;

import java.time.LocalDateTime;

public record UavResponse(Long id, String model, String serialNumber, String manufacturer,
                          UavStatus status, Long stationId, String stationName,
                          LocalDateTime lastMaintenanceAt, LocalDateTime createdAt) { }
