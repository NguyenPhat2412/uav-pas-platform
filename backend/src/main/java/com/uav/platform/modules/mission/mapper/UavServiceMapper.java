package com.uav.platform.modules.mission.mapper;

import com.uav.platform.modules.mission.config.response.UavServiceResponse;
import com.uav.platform.modules.mission.entity.UavService;

public final class UavServiceMapper {
    private UavServiceMapper() {}
    public static UavServiceResponse toResponse(UavService service) {
        return new UavServiceResponse(service.getId(), service.getCode(), service.getName(), service.getDescription(),
                service.isActive(), service.getDefaultDurationMinutes());
    }
}
