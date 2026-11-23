package com.uav.platform.support;

import com.uav.platform.dao.inventory.IEquipmentDao;
import com.uav.platform.dao.media.IMediaAssetDao;
import com.uav.platform.dao.mission.IMissionDao;
import com.uav.platform.dao.mission.IMissionEquipmentReservationDao;
import com.uav.platform.dao.mission.IMissionEventDao;
import com.uav.platform.dao.mission.IMissionMediaDao;
import com.uav.platform.dao.mission.IServiceOfferingDao;
import com.uav.platform.dao.station.IStationDao;
import com.uav.platform.dao.uav.IUavDao;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.request.mission.catalog.*;
import com.uav.platform.dto.request.mission.dispatch.*;
import com.uav.platform.dto.request.mission.flightplan.*;
import com.uav.platform.dto.request.mission.lifecycle.*;
import com.uav.platform.dto.response.mission.catalog.*;
import com.uav.platform.dto.response.mission.dispatch.*;
import com.uav.platform.dto.response.mission.flightplan.*;
import com.uav.platform.dto.response.mission.lifecycle.*;
import com.uav.platform.entity.mission.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.mission.catalog.*;
import com.uav.platform.service.impl.mission.dispatch.*;
import com.uav.platform.service.impl.mission.flightplan.*;
import com.uav.platform.service.impl.mission.lifecycle.*;
import com.uav.platform.service.inventory.InventoryService;
import com.uav.platform.service.mission.catalog.*;
import com.uav.platform.service.mission.dispatch.*;
import com.uav.platform.service.mission.flightplan.*;
import com.uav.platform.service.mission.lifecycle.*;
import com.uav.platform.service.notification.inbox.NotificationService;
import com.uav.platform.service.permission.PermissionService;

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
            com.uav.platform.service.uav.UavService uavService,
            NotificationService notifications) {
        jakarta.persistence.EntityManager entityManager = null;
        com.uav.platform.service.media.MediaAccessService mediaAccess = null;
        com.uav.platform.service.billing.quota.QuotaService quotaService = null;
        com.uav.platform.service.billing.invoice.MissionInvoiceService missionInvoiceService = null;
        var missionMapper =
                org.mapstruct.factory.Mappers.getMapper(
                        com.uav.platform.mapper.mission.lifecycle.MissionMapper.class);
        var missionEventMapper =
                org.mapstruct.factory.Mappers.getMapper(
                        com.uav.platform.mapper.mission.lifecycle.MissionEventMapper.class);
        var missionMediaMapper =
                org.mapstruct.factory.Mappers.getMapper(
                        com.uav.platform.mapper.mission.flightplan.MissionMediaMapper.class);
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
