package com.uav.platform.modules.station.config.response;

import com.uav.platform.modules.station.common.*;

import com.uav.platform.modules.station.common.StationStatus;

import java.time.LocalDateTime;

public record StationResponse(Long id, String code, String name, String address,
                              Double latitude, Double longitude, StationStatus status,
                              LocalDateTime createdAt, LocalDateTime updatedAt) { }
