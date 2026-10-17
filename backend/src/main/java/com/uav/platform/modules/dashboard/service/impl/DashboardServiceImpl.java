package com.uav.platform.modules.dashboard.service.impl;

import com.uav.platform.modules.audit.repository.AuditLogRepository;
import com.uav.platform.modules.dashboard.dto.response.DashboardResponse;
import com.uav.platform.modules.dashboard.dto.response.MissionDashboardResponse;
import com.uav.platform.modules.dashboard.mapper.DashboardMapper;
import com.uav.platform.modules.dashboard.service.DashboardService;
import com.uav.platform.modules.inventory.entity.Equipment;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.specification.EquipmentSpecifications;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.mission.enums.MissionStatus;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.specification.MissionSpecifications;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.enums.UavStatus;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.uav.specification.UavSpecifications;
import com.uav.platform.modules.user.repository.UserRepository;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardServiceImpl implements DashboardService {
    private final UserRepository users;
    private final StationRepository stations;
    private final UavRepository uavs;
    private final EquipmentRepository equipment;
    private final MediaAssetRepository media;
    private final AuditLogRepository audit;
    private final PermissionService permissionService;
    private final MissionRepository missions;

    public DashboardServiceImpl(
            UserRepository users,
            StationRepository stations,
            UavRepository uavs,
            EquipmentRepository equipment,
            MediaAssetRepository media,
            AuditLogRepository audit) {
        this(users, stations, uavs, equipment, media, audit, null);
    }

    public DashboardServiceImpl(
            UserRepository users,
            StationRepository stations,
            UavRepository uavs,
            EquipmentRepository equipment,
            MediaAssetRepository media,
            AuditLogRepository audit,
            PermissionService permissionService) {
        this.users = users;
        this.stations = stations;
        this.uavs = uavs;
        this.equipment = equipment;
        this.media = media;
        this.audit = audit;
        this.permissionService = permissionService;
        this.missions = null;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public DashboardServiceImpl(
            UserRepository users,
            StationRepository stations,
            UavRepository uavs,
            EquipmentRepository equipment,
            MediaAssetRepository media,
            AuditLogRepository audit,
            PermissionService permissionService,
            MissionRepository missions) {
        this.users = users;
        this.stations = stations;
        this.uavs = uavs;
        this.equipment = equipment;
        this.media = media;
        this.audit = audit;
        this.permissionService = permissionService;
        this.missions = missions;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardResponse summary(Authentication authentication) {
        boolean usersVisible = visible(authentication, "USER_READ");
        boolean stationsVisible = visible(authentication, "STATION_READ");
        boolean uavsVisible = visible(authentication, "UAV_READ");
        boolean inventoryVisible = visible(authentication, "INVENTORY_READ");
        boolean mediaVisible = visible(authentication, "MEDIA_READ");
        boolean auditVisible = visible(authentication, "AUDIT_READ");
        long units = 0, reserved = 0;
        for (Equipment item : equipment.findAll(EquipmentSpecifications.isActive())) {
            units += item.getQuantity();
            reserved += item.getReservedQuantity();
        }
        return DashboardMapper.toResponse(
                usersVisible ? users.count() : 0,
                stationsVisible ? stations.count() : 0,
                uavsVisible ? uavs.count() : 0,
                uavsVisible ? uavs.count(UavSpecifications.hasStatus(UavStatus.AVAILABLE)) : 0,
                uavsVisible ? uavs.count(UavSpecifications.hasStatus(UavStatus.MAINTENANCE)) : 0,
                inventoryVisible ? units : 0,
                inventoryVisible ? reserved : 0,
                mediaVisible ? media.count() : 0,
                auditVisible ? audit.count() : 0);
    }

    @Override
    @Transactional(readOnly = true)
    public MissionDashboardResponse missionSummary(Authentication authentication) {
        boolean all = visible(authentication, "MISSION_VIEW_ALL");
        long total;
        java.util.function.Function<MissionStatus, Long> count;
        if (all || authentication == null) {
            total = missions.count();
            count = status -> missions.count(MissionSpecifications.hasStatus(status));
        } else {
            AppUserView owner = owner(authentication);
            if (owner.id() == null) return DashboardMapper.toMissionResponse(0, 0, 0, 0, 0, 0, 0);
            total = missions.count(MissionSpecifications.hasCustomer(owner.id()));
            count =
                    status ->
                            missions.count(
                                    Specification.where(
                                                    MissionSpecifications.hasCustomer(owner.id()))
                                            .and(MissionSpecifications.hasStatus(status)));
        }
        return DashboardMapper.toMissionResponse(
                total,
                count.apply(MissionStatus.PENDING_CONFIRMATION),
                count.apply(MissionStatus.CONFIRMED),
                count.apply(MissionStatus.READY),
                count.apply(MissionStatus.IN_PROGRESS),
                count.apply(MissionStatus.COMPLETED),
                count.apply(MissionStatus.FAILED));
    }

    private AppUserView owner(Authentication authentication) {
        return users.findByUsername(authentication.getName())
                .map(user -> new AppUserView(user.getId()))
                .orElse(new AppUserView(null));
    }

    private record AppUserView(Long id) {}

    private boolean visible(Authentication authentication, String permission) {
        return permissionService == null || permissionService.has(authentication, permission);
    }
}
