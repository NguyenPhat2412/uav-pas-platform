package com.uav.platform.service.impl.mission.lifecycle;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.record.mission.lifecycle.MissionFilter;
import com.uav.platform.dto.response.mission.dispatch.MissionAvailabilityResponse;
import com.uav.platform.dto.response.mission.lifecycle.MissionEventResponse;
import com.uav.platform.dto.response.mission.lifecycle.MissionResponse;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.mission.MissionReview;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.station.StationStatus;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.mapper.mission.lifecycle.MissionEventMapper;
import com.uav.platform.mapper.mission.lifecycle.MissionMapper;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.mission.MissionReviewRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.mission.dispatch.MissionResourceService;
import com.uav.platform.service.mission.lifecycle.MissionAccessService;
import com.uav.platform.service.mission.lifecycle.MissionQueryService;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.specification.mission.lifecycle.MissionSpecifications;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/** Read-only mission queries, visibility and availability. */
@Service
@Transactional(readOnly = true)
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

    @Autowired(required = false)
    private MissionReviewRepository reviews;

    @Autowired
    public MissionQueryServiceImpl(
            MissionRepository missions,
            UserRepository users,
            PermissionService permissions,
            MissionEventRepository events,
            StationRepository stations,
            UavRepository uavs,
            MissionAccessService access,
            MissionResourceService resources,
            MissionMapper missionMapper,
            MissionEventMapper missionEventMapper) {
        this.missions = missions;
        this.users = users;
        this.permissions = permissions;
        this.events = events;
        this.stations = stations;
        this.uavs = uavs;
        this.access = access;
        this.resources = resources;
        this.missionMapper = missionMapper;
        this.missionEventMapper = missionEventMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public MissionResponse get(Long id, Authentication authentication) {
        Mission mission = access.find(id);
        access.enforceVisibility(mission, authentication);
        boolean isReviewed =
                reviews != null && reviews.findByMissionId(mission.getId()).isPresent();
        return applyOrderContext(
                mission, missionMapper.toResponse(mission), isReviewed, authentication);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MissionResponse> list(
            MissionFilter filter, Pageable pageable, Authentication authentication) {
        MissionFilter safeFilter = filter == null ? MissionFilter.empty() : filter;
        boolean viewAll =
                permissions.has(authentication, "MISSION_VIEW_ALL")
                        || permissions.has(authentication, "MARKETPLACE_MODERATE");
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
                                safeFilter.search(),
                                safeFilter.projectId(),
                                null,
                                safeFilter.statusGroup());
            } else {
                ownerId = viewer.getId();
            }
        }
        Page<Mission> page =
                missions.findAll(MissionSpecifications.filtered(safeFilter, ownerId), pageable);
        Set<Long> reviewedIds = resolveReviewedMissionIds(page.getContent());
        return PageResponse.from(
                page,
                m ->
                        applyOrderContext(
                                m,
                                missionMapper.toResponse(m),
                                reviewedIds.contains(m.getId()),
                                authentication));
    }

    private MissionResponse applyOrderContext(
            Mission mission,
            MissionResponse response,
            boolean isReviewed,
            Authentication authentication) {
        if (response == null) {
            return null;
        }
        boolean anonymize = shouldAnonymizeProvider(mission, authentication);
        if (!isReviewed && !anonymize) {
            return response;
        }
        MissionResponse updated = response.withOrderContext(isReviewed, anonymize);
        return updated != null ? updated : response;
    }

    private Set<Long> resolveReviewedMissionIds(List<Mission> items) {
        if (reviews == null || items == null || items.isEmpty()) {
            return Set.of();
        }
        List<Long> ids = items.stream().map(Mission::getId).filter(Objects::nonNull).toList();
        if (ids.isEmpty()) {
            return Set.of();
        }
        Set<Long> out = new HashSet<>();
        for (MissionReview r : reviews.findByMissionIdIn(ids)) {
            if (r.getMission() != null && r.getMission().getId() != null) {
                out.add(r.getMission().getId());
            }
        }
        return out;
    }

    private boolean shouldAnonymizeProvider(Mission mission, Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            return true;
        }
        if (permissions.has(auth, "MISSION_VIEW_ALL")
                || permissions.has(auth, "MARKETPLACE_MODERATE")
                || permissions.has(auth, "USER_MANAGE")) {
            return false;
        }
        String username = auth.getName();
        if (mission.getOperator() != null
                && Objects.equals(mission.getOperator().getUsername(), username)) {
            return false;
        }
        if (mission.getProvider() != null
                && mission.getProvider().getUser() != null
                && Objects.equals(mission.getProvider().getUser().getUsername(), username)) {
            return false;
        }
        return true;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MissionEventResponse> timeline(Long id, Authentication authentication) {
        Mission mission = access.accessible(id, authentication);
        boolean anonymize = shouldAnonymizeProvider(mission, authentication);
        return events.findByMissionIdOrderByCreatedAtAsc(mission.getId()).stream()
                .map(missionEventMapper::toResponse)
                .map(ev -> anonymize ? sanitizeTimelineEventForCustomer(ev, mission) : ev)
                .toList();
    }

    private static MissionEventResponse sanitizeTimelineEventForCustomer(
            MissionEventResponse ev, Mission mission) {
        String customerUsername =
                mission.getCustomer() != null ? mission.getCustomer().getUsername() : null;
        String safeActor =
                (ev.actor() != null
                                && customerUsername != null
                                && ev.actor().equalsIgnoreCase(customerUsername))
                        ? ev.actor()
                        : "Điều phối nền tảng UAV PAS";
        String desc = ev.description();
        if (desc != null) {
            if (mission.getProvider() != null && mission.getProvider().getDisplayName() != null) {
                desc = desc.replace(mission.getProvider().getDisplayName(), "đối tác đã xác minh");
            }
            if (mission.getOperator() != null && mission.getOperator().getFullName() != null) {
                desc = desc.replace(mission.getOperator().getFullName(), "kỹ sư đối tác");
            }
            if (mission.getUav() != null && mission.getUav().getSerialNumber() != null) {
                desc = desc.replace(mission.getUav().getSerialNumber(), "thiết bị bay chuyên dụng");
            }
        }
        return new MissionEventResponse(
                ev.id(),
                ev.eventType(),
                safeActor,
                ev.oldStatus(),
                ev.newStatus(),
                desc,
                null,
                ev.createdAt());
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
