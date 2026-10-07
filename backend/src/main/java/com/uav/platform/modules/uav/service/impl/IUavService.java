package com.uav.platform.modules.uav.service.impl;

import com.uav.platform.modules.uav.mapper.UavMapper;

import com.uav.platform.modules.audit.common.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.config.request.UavRequest;
import com.uav.platform.modules.uav.config.response.UavResponse;
import com.uav.platform.modules.uav.config.response.UavStatusHistoryResponse;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.common.UavStatus;
import com.uav.platform.modules.uav.entity.UavStatusHistory;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.uav.repository.UavStatusHistoryRepository;
import com.uav.platform.modules.uav.service.UavService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class IUavService implements UavService {
    private final UavRepository repository;
    private final StationRepository stations;
    private final UavStatusHistoryRepository history;
    private final AuditLogService audit;
    public IUavService(UavRepository repository, StationRepository stations, UavStatusHistoryRepository history, AuditLogService audit) {
        this.repository = repository; this.stations = stations; this.history = history; this.audit = audit;
    }
    @Override @Transactional(readOnly = true)
    public PageResponse<UavResponse> list(Pageable pageable) { return PageResponse.from(repository.findAll(pageable), UavMapper::toResponse); }
    @Override @Transactional(readOnly = true)
    public UavResponse get(Long id) { return UavMapper.toResponse(find(id)); }
    @Override
    public UavResponse create(UavRequest request, String actor) {
        if (repository.existsBySerialNumber(request.serialNumber())) throw SystemException.conflict("UAV serial number already exists");
        Uav saved = repository.save(new Uav(request.model(), request.serialNumber(), request.manufacturer()));
        history.save(new UavStatusHistory(saved, null, saved.getStatus(), "Created", actor));
        audit.record(null, actor, AuditAction.CREATE, "UAV", saved.getId().toString(), saved.getSerialNumber());
        return UavMapper.toResponse(saved);
    }
    @Override
    public UavResponse update(Long id, UavRequest request, String actor) {
        Uav uav = find(id); uav.update(request.model(), request.manufacturer());
        audit.record(null, actor, AuditAction.UPDATE, "UAV", id.toString(), uav.getSerialNumber());
        return UavMapper.toResponse(uav);
    }
    @Override
    public UavResponse assign(Long id, Long stationId, String actor) {
        Uav uav = find(id); Station station = stations.findById(stationId).orElseThrow(() -> SystemException.notFound("Station not found"));
        uav.setStation(station); if (uav.getStatus() == UavStatus.AVAILABLE) changeStatusInternal(uav, UavStatus.ASSIGNED, "Assigned to station", actor);
        audit.record(null, actor, AuditAction.ASSIGN, "UAV", id.toString(), station.getCode());
        return UavMapper.toResponse(uav);
    }
    @Override
    public UavResponse changeStatus(Long id, UavStatus status, String reason, String actor) {
        Uav uav = find(id); changeStatusInternal(uav, status, reason, actor);
        audit.record(null, actor, AuditAction.STATUS_CHANGE, "UAV", id.toString(), status.name());
        return UavMapper.toResponse(uav);
    }
    @Override
    public UavResponse maintenance(Long id, String actor) {
        Uav uav = find(id); UavStatus previous = uav.getStatus(); uav.markMaintenance();
        history.save(new UavStatusHistory(uav, previous, UavStatus.MAINTENANCE, "Maintenance started", actor));
        audit.record(null, actor, AuditAction.STATUS_CHANGE, "UAV", id.toString(), "MAINTENANCE");
        return UavMapper.toResponse(uav);
    }
    private void changeStatusInternal(Uav uav, UavStatus status, String reason, String actor) {
        UavStatus previous = uav.getStatus(); uav.setStatus(status);
        history.save(new UavStatusHistory(uav, previous, status, reason, actor));
    }
    @Override @Transactional(readOnly = true)
    public PageResponse<UavStatusHistoryResponse> history(Long id, Pageable pageable) {
        find(id);
        return PageResponse.from(history.findAll(Specification.where(
                com.uav.platform.modules.uav.specification.UavStatusHistorySpecifications.belongsToUav(id)), pageable),
                UavMapper::toResponse);
    }
    private Uav find(Long id) { return repository.findById(id).orElseThrow(() -> SystemException.notFound("UAV not found")); }
}
