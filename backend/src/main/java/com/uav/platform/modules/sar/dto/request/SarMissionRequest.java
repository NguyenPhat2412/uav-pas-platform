package com.uav.platform.modules.sar.dto.request;

import jakarta.validation.constraints.*;

/** searchAreaPolygon is JSON [[lat, lng], ...]; the cockpit ignores anything else. */
public record SarMissionRequest(
        @NotNull Long missionId,
        @NotBlank @Size(max = 20000) String searchAreaPolygon,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double lkpLatitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double lkpLongitude,
        @DecimalMin("10") @DecimalMax("50000") Double driftRadiusMeters,
        @Size(max = 100) String emergencyContact,
        @Min(0) @Max(10000) Integer victimCountEstimated,
        @Size(max = 2000) String notes) {}
