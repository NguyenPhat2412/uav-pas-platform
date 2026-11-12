package com.uav.platform.service.impl.airspace;

import com.uav.platform.dto.request.airspace.AirspaceCheckRequest;
import com.uav.platform.dto.request.airspace.AirspaceZoneUpsertRequest;
import com.uav.platform.dto.response.airspace.AirspaceCheckResponse;
import com.uav.platform.dto.response.airspace.AirspaceZoneResponse;
import com.uav.platform.entity.airspace.AirspaceZone;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.airspace.AirspaceMapper;
import com.uav.platform.repository.airspace.AirspaceZoneRepository;
import com.uav.platform.service.airspace.AirspaceService;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.permission.PermissionService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@Transactional
@RequiredArgsConstructor
public class AirspaceServiceImpl implements AirspaceService {

    private final AirspaceZoneRepository zoneRepository;
    private final AirspaceMapper airspaceMapper;
    private final PermissionService permissionService;
    private final AuditLogService auditLogService;

    @Override
    @Transactional(readOnly = true)
    public List<AirspaceZoneResponse> listZones(boolean activeOnly, Authentication authentication) {
        if (!activeOnly) {
            if (permissionService == null
                    || !permissionService.has(authentication, "USER_MANAGE")) {
                throw new AccessDeniedException(
                        "Viewing inactive airspace zones requires USER_MANAGE permission");
            }
            return zoneRepository.findAllByOrderByZoneTypeAscNameAsc().stream()
                    .map(airspaceMapper::toResponse)
                    .toList();
        }
        return zoneRepository.findByActiveTrueOrderByZoneTypeAscNameAsc().stream()
                .map(airspaceMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AirspaceCheckResponse check(AirspaceCheckRequest request) {
        List<AirspaceZone> activeZones = zoneRepository.findByActiveTrueOrderByZoneTypeAscNameAsc();
        return AirspaceGeometryOperations.evaluate(request, activeZones);
    }

    @Override
    public AirspaceZoneResponse createZone(
            AirspaceZoneUpsertRequest request, Authentication authentication) {
        String normalizedCode = request.code().trim().toUpperCase(Locale.ROOT);
        if (zoneRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw SystemException.conflict(
                            "Mã vùng không phận đã tồn tại: " + normalizedCode,
                            "AIRSPACE_ZONE_CODE_EXISTS")
                    .at("code");
        }
        AirspaceZone zone = new AirspaceZone();
        AirspaceGeometryOperations.applyUpsert(zone, request);
        AirspaceZone saved = zoneRepository.save(zone);
        if (auditLogService != null) {
            auditLogService.record(
                    null,
                    authentication == null ? "SYSTEM" : authentication.getName(),
                    AuditAction.CREATE,
                    "AIRSPACE_ZONE",
                    saved.getId() == null ? normalizedCode : saved.getId().toString(),
                    saved.getCode() + ":" + saved.getZoneType());
        }
        return airspaceMapper.toResponse(saved);
    }

    @Override
    public AirspaceZoneResponse updateZone(
            Long id, AirspaceZoneUpsertRequest request, Authentication authentication) {
        AirspaceZone zone =
                zoneRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy vùng không phận #" + id,
                                                "AIRSPACE_ZONE_NOT_FOUND"));
        String normalizedCode = request.code().trim().toUpperCase(Locale.ROOT);
        if (zoneRepository.existsByCodeIgnoreCaseAndIdNot(normalizedCode, id)) {
            throw SystemException.conflict(
                            "Mã vùng không phận đã tồn tại: " + normalizedCode,
                            "AIRSPACE_ZONE_CODE_EXISTS")
                    .at("code");
        }
        AirspaceGeometryOperations.applyUpsert(zone, request);
        AirspaceZone saved = zoneRepository.save(zone);
        if (auditLogService != null) {
            auditLogService.record(
                    null,
                    authentication == null ? "SYSTEM" : authentication.getName(),
                    AuditAction.UPDATE,
                    "AIRSPACE_ZONE",
                    id.toString(),
                    saved.getCode() + ":" + saved.getZoneType());
        }
        return airspaceMapper.toResponse(saved);
    }

    @Override
    public void deleteZone(Long id, Authentication authentication) {
        AirspaceZone zone =
                zoneRepository
                        .findById(id)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy vùng không phận #" + id,
                                                "AIRSPACE_ZONE_NOT_FOUND"));
        String code = zone.getCode();
        zoneRepository.delete(zone);
        if (auditLogService != null) {
            auditLogService.record(
                    null,
                    authentication == null ? "SYSTEM" : authentication.getName(),
                    AuditAction.DELETE,
                    "AIRSPACE_ZONE",
                    id.toString(),
                    code);
        }
    }
}
