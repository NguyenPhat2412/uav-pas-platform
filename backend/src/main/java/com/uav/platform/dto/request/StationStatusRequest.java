package com.uav.platform.dto.request;

import com.uav.platform.enums.StationStatus;

import jakarta.validation.constraints.NotNull;

/** Body of PATCH /stations/{id}/status (STATION_STATUS_UPDATE). */
public record StationStatusRequest(@NotNull StationStatus status) {}
