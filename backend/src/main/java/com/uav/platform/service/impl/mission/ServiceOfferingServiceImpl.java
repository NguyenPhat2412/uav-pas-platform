package com.uav.platform.service.impl.mission;

import com.uav.platform.dto.request.mission.ServiceOfferingRequest;
import com.uav.platform.dto.request.mission.ServiceOfferingUpdateRequest;
import com.uav.platform.dto.response.mission.ServiceOfferingResponse;
import com.uav.platform.entity.mission.ServiceOffering;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.mission.ServiceOfferingMapper;
import com.uav.platform.repository.mission.ServiceOfferingRepository;
import com.uav.platform.service.mission.ServiceOfferingService;
import com.uav.platform.specification.mission.ServiceOfferingSpecifications;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Sort;
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

    @Override
    @Transactional(readOnly = true)
    public List<ServiceOfferingResponse> listAll() {
        return services.findAll(Sort.by("name")).stream()
                .map(serviceOfferingMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public ServiceOfferingResponse update(Long id, ServiceOfferingUpdateRequest request) {
        ServiceOffering service = find(id);
        service.setName(request.name().trim());
        service.setDescription(
                request.description() == null || request.description().isBlank()
                        ? null
                        : request.description().trim());
        service.setDefaultDurationMinutes(request.defaultDurationMinutes());
        service.setSensors(
                request.sensors() == null || request.sensors().isEmpty()
                        ? null
                        : String.join(",", new java.util.LinkedHashSet<>(request.sensors())));
        service.setBestGsdCm(request.bestGsdCm());
        service.setMaxAreaHectares(request.maxAreaHectares());
        service.setMaxWindMs(request.maxWindMs());
        service.setOnSiteHours(request.onSiteHours());
        service.setDeliveryHours(request.deliveryHours());
        return serviceOfferingMapper.toResponse(services.save(service));
    }

    @Override
    @Transactional
    public ServiceOfferingResponse setActive(Long id, boolean active) {
        ServiceOffering service = find(id);
        service.setActive(active);
        return serviceOfferingMapper.toResponse(services.save(service));
    }

    private ServiceOffering find(Long id) {
        return services.findById(id)
                .orElseThrow(() -> SystemException.notFound("Service not found"));
    }
}
