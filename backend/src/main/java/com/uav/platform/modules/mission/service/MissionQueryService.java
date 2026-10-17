package com.uav.platform.modules.mission.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.mission.dto.request.*;
import com.uav.platform.modules.mission.dto.response.*;
import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.mapper.MissionEventMapper;
import com.uav.platform.modules.mission.mapper.MissionMapper;
import com.uav.platform.modules.mission.repository.MissionEventRepository;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.specification.MissionSpecifications;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.station.enums.StationStatus;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.enums.UavStatus;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Read-only mission queries, visibility and availability. */
@Service
@Transactional(readOnly = true)
@lombok.RequiredArgsConstructor
public class MissionQueryService {
    private final MissionRepository missions;
    private final UserRepository users;
    private final PermissionService permissions;
    private final MissionEventRepository events;
    private final StationRepository stations;
    private final UavRepository uavs;
    private final MissionAccessService access;
    private final MissionResourceService resources;

    @Transactional(readOnly = true)
    public MissionResponse get(Long id, Authentication authentication) {
        Mission mission = access.find(id);
        access.enforceVisibility(mission, authentication);
        return MissionMapper.toResponse(mission);
    }

    @Transactional(readOnly = true)
    public PageResponse<MissionResponse> list(
            MissionFilter filter, Pageable pageable, Authentication authentication) {
        MissionFilter safeFilter = filter == null ? MissionFilter.empty() : filter;
        boolean viewAll = permissions.has(authentication, "MISSION_VIEW_ALL");
        Long ownerId = null;
        if (!viewAll && authentication != null) {
            AppUser viewer = access.user(authentication.getName());
            if (viewer.getRole() == UserRole.ROLE_OPERATOR) {
                safeFilter =
                        new MissionFilter(
                                safeFilter.status(),
                                safeFilter.missionType(),
                                safeFilter.stationId(),
                                viewer.getId(),
                                null,
                                safeFilter.requestedDate(),
                                safeFilter.search());
            } else {
                ownerId = viewer.getId();
            }
        }
        Page<Mission> page =
                missions.findAll(MissionSpecifications.filtered(safeFilter, ownerId), pageable);
        return PageResponse.from(page, MissionMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<MissionEventResponse> timeline(Long id, Authentication authentication) {
        Mission mission = access.accessible(id, authentication);
        return events.findByMissionIdOrderByCreatedAtAsc(mission.getId()).stream()
                .map(MissionEventMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MissionAvailabilityResponse availability(
            java.time.LocalDateTime startTime,
            java.time.LocalDateTime endTime,
            Long stationId,
            Long uavId,
            Long operatorId) {
        if (startTime == null || endTime == null || !endTime.isAfter(startTime)) {
            return new MissionAvailabilityResponse(
                    false, false, false, false, "MISSION_TIME_CONFLICT");
        }
        boolean stationAvailable =
                stationId == null
                        || stations.findById(stationId)
                                .map(item -> item.getStatus() == StationStatus.ACTIVE)
                                .orElse(false);
        boolean uavAvailable =
                uavId == null
                        || uavs.findById(uavId)
                                .filter(item -> item.getStatus() == UavStatus.AVAILABLE)
                                .map(
                                        item ->
                                                !missions.exists(
                                                        MissionSpecifications.overlappingUav(
                                                                item.getId(),
                                                                resources.excludedStatuses(),
                                                                startTime,
                                                                endTime)))
                                .orElse(false);
        boolean operatorAvailable =
                operatorId == null
                        || users.findById(operatorId)
                                .filter(resources::eligibleOperator)
                                .map(
                                        item ->
                                                !missions.exists(
                                                        MissionSpecifications.overlappingOperator(
                                                                item.getId(),
                                                                resources.excludedStatuses(),
                                                                startTime,
                                                                endTime)))
                                .orElse(false);
        boolean available = stationAvailable && uavAvailable && operatorAvailable;
        return new MissionAvailabilityResponse(
                available,
                stationAvailable,
                uavAvailable,
                operatorAvailable,
                available ? "AVAILABLE" : "MISSION_TIME_CONFLICT");
    }
}
