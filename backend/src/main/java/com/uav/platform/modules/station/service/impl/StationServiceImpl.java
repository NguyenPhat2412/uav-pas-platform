package com.uav.platform.modules.station.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.station.dto.request.StationRequest;
import com.uav.platform.modules.station.dto.response.StationResponse;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.mapper.StationMapper;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.station.service.StationService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class StationServiceImpl implements StationService {
    private final StationRepository repository;
    private final AuditLogService audit;
    private final StationMapper stationMapper;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StationResponse> list(Pageable pageable) {
        return PageResponse.from(repository.findAll(pageable), stationMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public StationResponse get(Long id) {
        return stationMapper.toResponse(
                repository
                        .findById(id)
                        .orElseThrow(() -> SystemException.notFound("Station not found")));
    }

    @Override
    public StationResponse create(StationRequest request, String actor) {
        if (repository.existsByCode(request.code()))
            throw SystemException.conflict("Station code already exists");
        Station saved =
                repository.save(
                        StationOperations.create(
                                request.code(),
                                request.name(),
                                request.address(),
                                request.latitude(),
                                request.longitude(),
                                request.status()));
        audit.record(
                null,
                actor,
                AuditAction.CREATE,
                "STATION",
                saved.getId().toString(),
                saved.getCode());
        return stationMapper.toResponse(saved);
    }

    @Override
    public StationResponse update(Long id, StationRequest request, String actor) {
        Station station =
                repository
                        .findById(id)
                        .orElseThrow(() -> SystemException.notFound("Station not found"));
        StationOperations.update(
                station,
                request.name(),
                request.address(),
                request.latitude(),
                request.longitude(),
                request.status());
        audit.record(null, actor, AuditAction.UPDATE, "STATION", id.toString(), station.getCode());
        return stationMapper.toResponse(station);
    }

    @Override
    public void delete(Long id, String actor) {
        Station station =
                repository
                        .findById(id)
                        .orElseThrow(() -> SystemException.notFound("Station not found"));
        repository.delete(station);
        audit.record(null, actor, AuditAction.DELETE, "STATION", id.toString(), station.getCode());
    }
}
