package com.uav.platform.modules.mission.mapper;

import com.uav.platform.modules.mission.dto.request.ServiceOfferingRequest;
import com.uav.platform.modules.mission.dto.response.ServiceOfferingResponse;
import com.uav.platform.modules.mission.entity.ServiceOffering;

public final class ServiceOfferingMapper {
    private ServiceOfferingMapper() {}

    public static ServiceOffering toEntity(ServiceOfferingRequest request) {
        return new ServiceOffering(
                request.code(),
                request.name(),
                request.description(),
                request.defaultDurationMinutes());
    }

    public static ServiceOfferingResponse toResponse(ServiceOffering service) {
        return new ServiceOfferingResponse(
                service.getId(),
                service.getCode(),
                service.getName(),
                service.getDescription(),
                service.isActive(),
                service.getDefaultDurationMinutes());
    }
}
