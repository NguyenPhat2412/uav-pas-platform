package com.uav.platform.service.impl.dashboard;

import com.uav.platform.dto.record.dashboard.AppUserView;
import com.uav.platform.dto.response.dashboard.DashboardResponse;
import com.uav.platform.dto.response.dashboard.MissionDashboardResponse;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.mapper.dashboard.DashboardMapper;
import com.uav.platform.repository.audit.AuditLogRepository;
import com.uav.platform.repository.inventory.EquipmentRepository;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.dashboard.DashboardService;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.specification.inventory.EquipmentSpecifications;
import com.uav.platform.specification.mission.MissionSpecifications;
import com.uav.platform.specification.uav.UavSpecifications;

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
    private final DashboardMapper dashboardMapper;

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
        this(users, stations, uavs, equipment, media, audit, permissionService, null);
    }

    public DashboardServiceImpl(
            UserRepository users,
            StationRepository stations,
            UavRepository uavs,
            EquipmentRepository equipment,
            MediaAssetRepository media,
            AuditLogRepository audit,
            PermissionService permissionService,
            MissionRepository missions) {
        this(
                users,
                stations,
                uavs,
                equipment,
                media,
                audit,
                permissionService,
                missions,
                org.mapstruct.factory.Mappers.getMapper(DashboardMapper.class));
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
            MissionRepository missions,
            DashboardMapper dashboardMapper) {
        this.users = users;
        this.stations = stations;
        this.uavs = uavs;
        this.equipment = equipment;
        this.media = media;
        this.audit = audit;
        this.permissionService = permissionService;
        this.missions = missions;
        this.dashboardMapper = dashboardMapper;
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
        return dashboardMapper.toResponse(
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
            if (owner.id() == null) return dashboardMapper.toMissionResponse(0, 0, 0, 0, 0, 0, 0);
            total = missions.count(MissionSpecifications.hasCustomer(owner.id()));
            count =
                    status ->
                            missions.count(
                                    Specification.where(
                                                    MissionSpecifications.hasCustomer(owner.id()))
                                            .and(MissionSpecifications.hasStatus(status)));
        }
        return dashboardMapper.toMissionResponse(
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

    private boolean visible(Authentication authentication, String permission) {
        return permissionService == null || permissionService.has(authentication, permission);
    }
}
