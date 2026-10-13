package com.uav.platform.modules.sar.config.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SarMissionRequest(
    @NotNull Long missionId,
    @NotBlank String searchAreaPolygon,
    @NotNull Double lkpLatitude,
    @NotNull Double lkpLongitude,
    Double driftRadiusMeters,
    String emergencyContact,
    Integer victimCountEstimated,
    String notes
) {}
