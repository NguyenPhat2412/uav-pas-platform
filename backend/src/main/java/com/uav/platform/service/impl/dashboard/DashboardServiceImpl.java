package com.uav.platform.service.impl.dashboard;

import com.uav.platform.dao.audit.IAuditLogDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dao.inventory.IEquipmentDao;
import com.uav.platform.dao.media.IMediaAssetDao;
import com.uav.platform.dao.mission.IMissionDao;
import com.uav.platform.dao.station.IStationDao;
import com.uav.platform.dao.uav.IUavDao;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.record.dashboard.AppUserView;
import com.uav.platform.dto.response.dashboard.DashboardResponse;
import com.uav.platform.dto.response.dashboard.MissionDashboardResponse;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.mapper.dashboard.DashboardMapper;
import com.uav.platform.service.dashboard.DashboardService;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.specification.inventory.EquipmentSpecifications;
import com.uav.platform.specification.mission.lifecycle.MissionSpecifications;
import com.uav.platform.specification.uav.UavSpecifications;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardServiceImpl implements DashboardService {
    private final IUserDao users;
    private final IStationDao stations;
    private final IUavDao uavs;
    private final IEquipmentDao equipment;
    private final IMediaAssetDao media;
    private final IAuditLogDao audit;
    private final PermissionService permissionService;
    private final IMissionDao missions;
    private final DashboardMapper dashboardMapper;

    public DashboardServiceImpl(
            IUserDao users,
            IStationDao stations,
            IUavDao uavs,
            IEquipmentDao equipment,
            IMediaAssetDao media,
            IAuditLogDao audit) {
        this(users, stations, uavs, equipment, media, audit, null);
    }

    public DashboardServiceImpl(
            IUserDao users,
            IStationDao stations,
            IUavDao uavs,
            IEquipmentDao equipment,
            IMediaAssetDao media,
            IAuditLogDao audit,
            PermissionService permissionService) {
        this(users, stations, uavs, equipment, media, audit, permissionService, null);
    }

    public DashboardServiceImpl(
            IUserDao users,
            IStationDao stations,
            IUavDao uavs,
            IEquipmentDao equipment,
            IMediaAssetDao media,
            IAuditLogDao audit,
            PermissionService permissionService,
            IMissionDao missions) {
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
            IUserDao users,
            IStationDao stations,
            IUavDao uavs,
            IEquipmentDao equipment,
            IMediaAssetDao media,
            IAuditLogDao audit,
            PermissionService permissionService,
            IMissionDao missions,
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
        boolean usersVisible = visible(authentication, "DASHBOARD_USER");
        boolean stationsVisible = visible(authentication, "DASHBOARD_STATION");
        boolean uavsVisible = visible(authentication, "DASHBOARD_UAV");
        boolean inventoryVisible = visible(authentication, "DASHBOARD_INVENTORY");
        boolean mediaVisible = visible(authentication, "MEDIA_VIEW");
        boolean auditVisible = visible(authentication, "AUDIT_VIEW");
        // A hidden area is not even queried (BR-23): its figures stay 0 and the widget is not
        // shown.
        long units = 0, reserved = 0;
        if (inventoryVisible) {
            for (Equipment item : equipment.findAll(EquipmentSpecifications.isActive())) {
                units += item.getQuantity();
                reserved += item.getReservedQuantity();
            }
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
                                    HibernateSpecification.where(
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
