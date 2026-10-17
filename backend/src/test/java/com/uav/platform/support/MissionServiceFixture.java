package com.uav.platform.support;

import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.service.InventoryService;
import com.uav.platform.modules.media.repository.MediaAssetRepository;
import com.uav.platform.modules.mission.dto.request.*;
import com.uav.platform.modules.mission.dto.response.*;
import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.repository.MissionEquipmentReservationRepository;
import com.uav.platform.modules.mission.repository.MissionEventRepository;
import com.uav.platform.modules.mission.repository.MissionMediaRepository;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.repository.ServiceOfferingRepository;
import com.uav.platform.modules.mission.service.*;
import com.uav.platform.modules.mission.service.impl.MissionServiceImpl;
import com.uav.platform.modules.notification.service.NotificationService;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.user.repository.UserRepository;

/** Keeps unit-test fixture wiring outside the production service constructors. */
public final class MissionServiceFixture {
    private MissionServiceFixture() {}

    public static MissionServiceImpl create(
            MissionRepository missions,
            ServiceOfferingRepository services,
            UserRepository users,
            PermissionService permissions,
            AuditLogService audit,
            MissionEventRepository events) {
        return create(
                missions,
                services,
                users,
                permissions,
                audit,
                events,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null);
    }

    public static MissionServiceImpl create(
            MissionRepository missions,
            ServiceOfferingRepository services,
            UserRepository users,
            PermissionService permissions,
            AuditLogService audit,
            MissionEventRepository events,
            StationRepository stations,
            UavRepository uavs,
            EquipmentRepository equipment,
            InventoryService inventory,
            MissionEquipmentReservationRepository reservations) {
        return create(
                missions,
                services,
                users,
                permissions,
                audit,
                events,
                stations,
                uavs,
                equipment,
                inventory,
                reservations,
                null,
                null,
                null,
                null);
    }

    public static MissionServiceImpl create(
            MissionRepository missions,
            ServiceOfferingRepository services,
            UserRepository users,
            PermissionService permissions,
            AuditLogService audit,
            MissionEventRepository events,
            StationRepository stations,
            UavRepository uavs,
            EquipmentRepository equipment,
            InventoryService inventory,
            MissionEquipmentReservationRepository reservations,
            MediaAssetRepository mediaAssets,
            MissionMediaRepository missionMedia,
            com.uav.platform.modules.uav.service.UavService uavService) {
        return create(
                missions,
                services,
                users,
                permissions,
                audit,
                events,
                stations,
                uavs,
                equipment,
                inventory,
                reservations,
                mediaAssets,
                missionMedia,
                uavService,
                null);
    }

    public static MissionServiceImpl create(
            MissionRepository missions,
            ServiceOfferingRepository services,
            UserRepository users,
            PermissionService permissions,
            AuditLogService audit,
            MissionEventRepository events,
            StationRepository stations,
            UavRepository uavs,
            EquipmentRepository equipment,
            InventoryService inventory,
            MissionEquipmentReservationRepository reservations,
            MediaAssetRepository mediaAssets,
            MissionMediaRepository missionMedia,
            com.uav.platform.modules.uav.service.UavService uavService,
            NotificationService notifications) {
        jakarta.persistence.EntityManager entityManager = null;
        com.uav.platform.modules.media.service.MediaAccessService mediaAccess = null;
        com.uav.platform.modules.billing.service.QuotaService quotaService = null;
        com.uav.platform.modules.billing.service.MissionInvoiceService missionInvoiceService = null;
        var access = new MissionAccessService(entityManager, missions, users, permissions);
        var missionEvents = new MissionEventService(events, notifications, access);
        var resources =
                new MissionResourceService(
                        entityManager,
                        missions,
                        users,
                        uavs,
                        equipment,
                        inventory,
                        reservations,
                        uavService);
        var dispatch =
                new MissionDispatchService(
                        entityManager,
                        missions,
                        permissions,
                        audit,
                        events,
                        stations,
                        inventory,
                        reservations,
                        access,
                        missionEvents,
                        resources);
        var queries =
                new MissionQueryService(
                        missions, users, permissions, events, stations, uavs, access, resources);
        var media =
                new MissionMediaService(
                        permissions,
                        audit,
                        mediaAssets,
                        mediaAccess,
                        missionMedia,
                        access,
                        missionEvents);
        var billing = new MissionBillingService(quotaService, missionInvoiceService);
        var lifecycle =
                new MissionLifecycleService(
                        missions,
                        services,
                        audit,
                        events,
                        quotaService,
                        missionMedia,
                        access,
                        missionEvents,
                        resources,
                        billing);
        return new MissionServiceImpl(lifecycle, queries, dispatch, media);
    }
}
