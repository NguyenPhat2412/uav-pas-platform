package com.uav.platform.support;

import com.uav.platform.dao.IEquipmentDao;
import com.uav.platform.dao.IMediaAssetDao;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IMissionEquipmentReservationDao;
import com.uav.platform.dao.IMissionEventDao;
import com.uav.platform.dao.IMissionMediaDao;
import com.uav.platform.dao.IServiceOfferingDao;
import com.uav.platform.dao.IStationDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.request.*;
import com.uav.platform.dto.response.*;
import com.uav.platform.entity.*;
import com.uav.platform.enums.*;
import com.uav.platform.service.*;
import com.uav.platform.service.AuditLogService;
import com.uav.platform.service.InventoryService;
import com.uav.platform.service.NotificationService;
import com.uav.platform.service.PermissionService;
import com.uav.platform.service.impl.*;

/** Keeps unit-test fixture wiring outside the production service constructors. */
public final class MissionServiceFixture {
    private MissionServiceFixture() {}

    public static MissionServiceImpl create(
            IMissionDao missions,
            IServiceOfferingDao services,
            IUserDao users,
            PermissionService permissions,
            AuditLogService audit,
            IMissionEventDao events) {
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
            IMissionDao missions,
            IServiceOfferingDao services,
            IUserDao users,
            PermissionService permissions,
            AuditLogService audit,
            IMissionEventDao events,
            IStationDao stations,
            IUavDao uavs,
            IEquipmentDao equipment,
            InventoryService inventory,
            IMissionEquipmentReservationDao reservations) {
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
            IMissionDao missions,
            IServiceOfferingDao services,
            IUserDao users,
            PermissionService permissions,
            AuditLogService audit,
            IMissionEventDao events,
            IStationDao stations,
            IUavDao uavs,
            IEquipmentDao equipment,
            InventoryService inventory,
            IMissionEquipmentReservationDao reservations,
            IMediaAssetDao mediaAssets,
            IMissionMediaDao missionMedia,
            com.uav.platform.service.UavService uavService) {
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
            IMissionDao missions,
            IServiceOfferingDao services,
            IUserDao users,
            PermissionService permissions,
            AuditLogService audit,
            IMissionEventDao events,
            IStationDao stations,
            IUavDao uavs,
            IEquipmentDao equipment,
            InventoryService inventory,
            IMissionEquipmentReservationDao reservations,
            IMediaAssetDao mediaAssets,
            IMissionMediaDao missionMedia,
            com.uav.platform.service.UavService uavService,
            NotificationService notifications) {
        jakarta.persistence.EntityManager entityManager = null;
        com.uav.platform.service.MediaAccessService mediaAccess = null;
        com.uav.platform.service.QuotaService quotaService = null;
        com.uav.platform.service.MissionInvoiceService missionInvoiceService = null;
        var missionMapper =
                org.mapstruct.factory.Mappers.getMapper(
                        com.uav.platform.mapper.MissionMapper.class);
        var missionEventMapper =
                org.mapstruct.factory.Mappers.getMapper(
                        com.uav.platform.mapper.MissionEventMapper.class);
        var missionMediaMapper =
                org.mapstruct.factory.Mappers.getMapper(
                        com.uav.platform.mapper.MissionMediaMapper.class);
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
