package com.uav.platform.service.impl.station;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.station.StationRequest;
import com.uav.platform.dto.response.station.StationResponse;
import com.uav.platform.entity.station.Station;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.station.StationStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.station.StationMapper;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.station.StationService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

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
    public PageResponse<StationResponse> list(
            String search, StationStatus status, Pageable pageable) {
        String term =
                search == null || search.isBlank() ? null : "%" + search.trim().toLowerCase() + "%";
        Specification<Station> spec =
                (root, query, cb) -> {
                    var where = cb.conjunction();
                    if (term != null) {
                        where =
                                cb.and(
                                        where,
                                        cb.or(
                                                cb.like(cb.lower(root.get("code")), term),
                                                cb.like(cb.lower(root.get("name")), term),
                                                cb.like(cb.lower(root.get("address")), term)));
                    }
                    if (status != null) where = cb.and(where, cb.equal(root.get("status"), status));
                    return where;
                };
        return PageResponse.from(repository.findAll(spec, pageable), stationMapper::toResponse);
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
            throw SystemException.conflict("Station code already exists").at("code");
        Station saved =
                repository.save(
                        StationOperations.create(
                                request.code(),
                                request.name(),
                                request.address(),
                                request.latitude(),
                                request.longitude(),
                                request.status()));
        saved.setDescription(request.description());
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
        // Status has its own permission and endpoint (STATION_STATUS_UPDATE); an edit never changes
        // it.
        StationOperations.update(
                station,
                request.name(),
                request.address(),
                request.latitude(),
                request.longitude(),
                null);
        station.setDescription(request.description());
        audit.record(null, actor, AuditAction.UPDATE, "STATION", id.toString(), station.getCode());
        return stationMapper.toResponse(station);
    }

    @Override
    public StationResponse updateStatus(Long id, StationStatus status, String actor) {
        Station station = find(id);
        StationStatus previous = station.getStatus();
        if (previous != status) {
            station.setStatus(status);
            audit.record(
                    null,
                    actor,
                    AuditAction.STATUS_CHANGE,
                    "STATION",
                    id.toString(),
                    previous + " -> " + status);
        }
        return stationMapper.toResponse(station);
    }

    @Override
    public Optional<StationResponse> delete(Long id, String actor) {
        Station station = find(id);
        if (repository.hasReferences(id)) {
            return Optional.of(updateStatus(id, StationStatus.INACTIVE, actor));
        }
        repository.delete(station);
        audit.record(null, actor, AuditAction.DELETE, "STATION", id.toString(), station.getCode());
        return Optional.empty();
    }

    private Station find(Long id) {
        return repository
                .findById(id)
                .orElseThrow(() -> SystemException.notFound("Station not found"));
    }
}
