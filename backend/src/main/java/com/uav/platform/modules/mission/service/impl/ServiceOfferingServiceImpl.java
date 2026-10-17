package com.uav.platform.modules.mission.service.impl;

import com.uav.platform.modules.mission.dto.request.ServiceOfferingRequest;
import com.uav.platform.modules.mission.dto.response.ServiceOfferingResponse;
import com.uav.platform.modules.mission.mapper.ServiceOfferingMapper;
import com.uav.platform.modules.mission.repository.ServiceOfferingRepository;
import com.uav.platform.modules.mission.service.ServiceOfferingService;
import com.uav.platform.modules.mission.specification.ServiceOfferingSpecifications;

import lombok.RequiredArgsConstructor;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor(onConstructor_ = @org.springframework.beans.factory.annotation.Autowired)
public class ServiceOfferingServiceImpl implements ServiceOfferingService {
    private final ServiceOfferingRepository services;
    private final ServiceOfferingMapper serviceOfferingMapper;

    public ServiceOfferingServiceImpl(ServiceOfferingRepository services) {
        this(services, org.mapstruct.factory.Mappers.getMapper(ServiceOfferingMapper.class));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceOfferingResponse> list() {
        return services
                .findAll(Specification.where(ServiceOfferingSpecifications.isActive()))
                .stream()
                .map(serviceOfferingMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public ServiceOfferingResponse create(ServiceOfferingRequest request) {
        if (services.findByCode(request.code()).isPresent())
            throw new IllegalStateException("Service code already exists");
        return serviceOfferingMapper.toResponse(
                services.save(
                        ServiceOfferingOperations.create(
                                request.code(),
                                request.name(),
                                request.description(),
                                request.defaultDurationMinutes())));
    }
}
