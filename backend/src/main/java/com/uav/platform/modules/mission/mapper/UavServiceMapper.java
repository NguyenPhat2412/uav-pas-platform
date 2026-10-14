package com.uav.platform.modules.mission.mapper;

import com.uav.platform.modules.mission.config.request.UavServiceRequest;
import com.uav.platform.modules.mission.config.response.UavServiceResponse;
import com.uav.platform.modules.mission.entity.UavService;

public final class UavServiceMapper {
    private UavServiceMapper() {}
    public static UavService toEntity(UavServiceRequest request) {
        return new UavService(request.code(), request.name(), request.description(), request.defaultDurationMinutes());
    }
    public static UavServiceResponse toResponse(UavService service) {
        return new UavServiceResponse(service.getId(), service.getCode(), service.getName(), service.getDescription(),
                service.isActive(), service.getDefaultDurationMinutes());
    }
}
