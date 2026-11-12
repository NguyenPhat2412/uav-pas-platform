package com.uav.platform.dto.request.station;

import com.uav.platform.enums.station.StationStatus;

import jakarta.validation.constraints.NotNull;

/** Body of PATCH /stations/{id}/status (STATION_STATUS_UPDATE). */
public record StationStatusRequest(@NotNull StationStatus status) {}
