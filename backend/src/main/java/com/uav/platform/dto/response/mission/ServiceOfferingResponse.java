package com.uav.platform.dto.response.mission;

import java.util.List;

/** Spec fields are null when operations have not committed to a value. */
@io.swagger.v3.oas.annotations.media.Schema(name = "UavServiceResponse")
public record ServiceOfferingResponse(
        Long id,
        String code,
        String name,
        String description,
        boolean active,
        int defaultDurationMinutes,
        List<String> sensors,
        Double bestGsdCm,
        Double maxAreaHectares,
        Double maxWindMs,
        Integer onSiteHours,
        Integer deliveryHours) {

    public ServiceOfferingResponse(
            Long id,
            String code,
            String name,
            String description,
            boolean active,
            int defaultDurationMinutes) {
        this(
                id,
                code,
                name,
                description,
                active,
                defaultDurationMinutes,
                List.of(),
                null,
                null,
                null,
                null,
                null);
    }
}
