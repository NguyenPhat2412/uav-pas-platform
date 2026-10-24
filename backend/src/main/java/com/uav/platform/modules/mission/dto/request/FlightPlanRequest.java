package com.uav.platform.modules.mission.dto.request;

import jakarta.validation.constraints.*;

import java.util.List;

/**
 * Customer flight-area plan. area is the operating envelope: POINT (takeoff/landing zone only), POLYGON (2..100
 * [lat, lng] vertices) or CIRCLE (one [lat, lng] centre plus radiusMeters). Area, perimeter and centre are always
 * recomputed on the server.
 */
public record FlightPlanRequest(
        @NotNull @Pattern(regexp = "POINT|POLYGON|CIRCLE") String areaType,
        @Size(max = 100) List<@Size(min = 2, max = 2) List<@NotNull Double>> vertices,
        @Min(100) @Max(2000) Integer radiusMeters,
        @DecimalMin("-90") @DecimalMax("90") Double takeoffLatitude,
        @DecimalMin("-180") @DecimalMax("180") Double takeoffLongitude,
        @NotNull Integer altitudeAglMeters,
        @NotNull Double targetGsdCm,
        @NotNull @Min(60) @Max(90) Integer forwardOverlap,
        @NotNull @Min(50) @Max(85) Integer sideOverlap,
        @NotNull @Size(min = 1, max = 4)
                List<@Pattern(regexp = "RGB_4K|THERMAL|LIDAR|MULTISPECTRAL") String> sensors,
        @Size(max = 1000) String obstacles,
        boolean permitSupport) {}
