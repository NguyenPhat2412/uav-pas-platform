package com.uav.platform.support;

import com.uav.platform.dto.request.mission.*;
import com.uav.platform.dto.response.mission.*;
import com.uav.platform.entity.mission.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.repository.inventory.EquipmentRepository;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.mission.MissionEquipmentReservationRepository;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.repository.mission.MissionMediaRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.mission.ServiceOfferingRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.mission.*;
import com.uav.platform.service.inventory.InventoryService;
import com.uav.platform.service.mission.*;
import com.uav.platform.service.notification.NotificationService;
import com.uav.platform.service.permission.PermissionService;

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
            com.uav.platform.service.uav.UavService uavService) {
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
            com.uav.platform.service.uav.UavService uavService,
            NotificationService notifications) {
        jakarta.persistence.EntityManager entityManager = null;
        com.uav.platform.service.media.MediaAccessService mediaAccess = null;
        com.uav.platform.service.billing.QuotaService quotaService = null;
        com.uav.platform.service.billing.MissionInvoiceService missionInvoiceService = null;
        var missionMapper =
                org.mapstruct.factory.Mappers.getMapper(
                        com.uav.platform.mapper.mission.MissionMapper.class);
        var missionEventMapper =
                org.mapstruct.factory.Mappers.getMapper(
                        com.uav.platform.mapper.mission.MissionEventMapper.class);
        var missionMediaMapper =
                org.mapstruct.factory.Mappers.getMapper(
                        com.uav.platform.mapper.mission.MissionMediaMapper.class);
        var access = new MissionAccessServiceImpl(entityManager, missions, users, permissions);
        var missionEvents = new MissionEventServiceImpl(events, notifications, access);
        var resources =
                new MissionResourceServiceImpl(
                        entityManager,
                        missions,
                        users,
                        uavs,
                        equipment,
                        inventory,
                        reservations,
                        uavService);
        var dispatch =
                new MissionDispatchServiceImpl(
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
                        resources,
                        missionMapper);
        var queries =
                new MissionQueryServiceImpl(
                        missions,
                        users,
                        permissions,
                        events,
                        stations,
                        uavs,
                        access,
                        resources,
                        missionMapper,
                        missionEventMapper);
        var media =
                new MissionMediaServiceImpl(
                        permissions,
                        audit,
                        mediaAssets,
                        mediaAccess,
                        missionMedia,
                        access,
                        missionEvents,
                        missionMediaMapper);
        var billing = new MissionBillingServiceImpl(quotaService, missionInvoiceService);
        var lifecycle =
                new MissionLifecycleServiceImpl(
                        missions,
                        services,
                        audit,
                        events,
                        quotaService,
                        missionMedia,
                        access,
                        missionEvents,
                        resources,
                        billing,
                        missionMapper);
        return new MissionServiceImpl(lifecycle, queries, dispatch, media);
    }
}
