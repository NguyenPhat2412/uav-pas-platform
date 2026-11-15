package com.uav.platform.service.impl.mission.lifecycle;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.record.mission.lifecycle.MissionFilter;
import com.uav.platform.dto.request.mission.catalog.*;
import com.uav.platform.dto.request.mission.dispatch.*;
import com.uav.platform.dto.request.mission.flightplan.*;
import com.uav.platform.dto.request.mission.lifecycle.*;
import com.uav.platform.dto.response.mission.catalog.*;
import com.uav.platform.dto.response.mission.dispatch.*;
import com.uav.platform.dto.response.mission.flightplan.*;
import com.uav.platform.dto.response.mission.lifecycle.*;
import com.uav.platform.entity.mission.*;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.StationStatus;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.mapper.mission.lifecycle.MissionEventMapper;
import com.uav.platform.mapper.mission.lifecycle.MissionMapper;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.mission.dispatch.MissionResourceService;
import com.uav.platform.service.mission.lifecycle.MissionAccessService;
import com.uav.platform.service.mission.lifecycle.MissionQueryService;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.specification.mission.lifecycle.MissionSpecifications;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Read-only mission queries, visibility and availability. */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MissionQueryServiceImpl implements MissionQueryService {
    private final MissionRepository missions;
    private final UserRepository users;
    private final PermissionService permissions;
    private final MissionEventRepository events;
    private final StationRepository stations;
    private final UavRepository uavs;
    private final MissionAccessService access;
    private final MissionResourceService resources;
    private final MissionMapper missionMapper;
    private final MissionEventMapper missionEventMapper;

    @Override
    @Transactional(readOnly = true)
    public MissionResponse get(Long id, Authentication authentication) {
        Mission mission = access.find(id);
        access.enforceVisibility(mission, authentication);
        return missionMapper.toResponse(mission);
    }

    @Override
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
        return PageResponse.from(page, missionMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionEventResponse> timeline(Long id, Authentication authentication) {
        Mission mission = access.accessible(id, authentication);
        return events.findByMissionIdOrderByCreatedAtAsc(mission.getId()).stream()
                .map(missionEventMapper::toResponse)
                .toList();
    }

    @Override
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
