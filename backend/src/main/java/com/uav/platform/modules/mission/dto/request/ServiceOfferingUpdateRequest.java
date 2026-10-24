package com.uav.platform.modules.mission.dto.request;

import jakarta.validation.constraints.*;

import java.util.List;

/**
 * Editable fields of a service; the code is the stable key customers' missions refer to, so it never changes.
 * Spec fields are optional commitments shown to customers; leave them null rather than guessing.
 */
@io.swagger.v3.oas.annotations.media.Schema(name = "UavServiceUpdateRequest")
public record ServiceOfferingUpdateRequest(
        @NotBlank @Size(max = 160) String name,
        @Size(max = 500) String description,
        @Min(1) @Max(1440) int defaultDurationMinutes,
        @Size(max = 4) List<@Pattern(regexp = "RGB_4K|THERMAL|LIDAR|MULTISPECTRAL") String> sensors,
        @DecimalMin("0.1") @DecimalMax("100") Double bestGsdCm,
        @DecimalMin("0.1") @DecimalMax("100000") Double maxAreaHectares,
        @DecimalMin("1") @DecimalMax("40") Double maxWindMs,
        @Min(1) @Max(720) Integer onSiteHours,
        @Min(1) @Max(2160) Integer deliveryHours) {

    public ServiceOfferingUpdateRequest(
            String name, String description, int defaultDurationMinutes) {
        this(name, description, defaultDurationMinutes, null, null, null, null, null, null);
    }
}
