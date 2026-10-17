package com.uav.platform.modules.mission.dto.response;

import com.uav.platform.modules.mission.enums.*;

@io.swagger.v3.oas.annotations.media.Schema(name = "UavServiceResponse")
public record ServiceOfferingResponse(
        Long id,
        String code,
        String name,
        String description,
        boolean active,
        int defaultDurationMinutes) {}
