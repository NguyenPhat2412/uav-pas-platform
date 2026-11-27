package com.uav.platform.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.*;
import com.uav.platform.dao.IEquipmentDao;
import com.uav.platform.dao.IMediaAssetDao;
import com.uav.platform.dao.IStationDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dto.request.MissionMediaRequest;
import com.uav.platform.entity.*;
import com.uav.platform.entity.AppUser;
import com.uav.platform.enums.*;
import com.uav.platform.enums.UserStatus;
import com.uav.platform.service.AuditLogService;
import com.uav.platform.service.InventoryService;
import com.uav.platform.service.PermissionService;
import com.uav.platform.service.impl.MissionOperations;
import com.uav.platform.service.impl.MissionServiceImpl;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

class MissionMediaTimelineTest {
    @Test
    void timelineReturnsEventsInRepositoryOrder() {
        Mission mission = mission();
        MissionEvent created =
                new MissionEvent(
                        mission,
                        MissionEventType.CREATED,
                        null,
                        null,
                        MissionStatus.DRAFT,
                        "Created",
                        null);
        MissionEvent started =
                new MissionEvent(
                        mission,
                        MissionEventType.STATUS_CHANGED,
                        null,
                        MissionStatus.READY,
                        MissionStatus.IN_PROGRESS,
                        "Started",
                        null);
        IMissionDao missions = repository(mission);
        IMissionEventDao events = mock(IMissionEventDao.class);
        when(events.findByMissionIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(created, started));
        MissionServiceImpl service =
                service(
                        missions,
                        events,
                        mock(PermissionService.class),
                        mock(IMediaAssetDao.class),
                        mock(IMissionMediaDao.class));

        assertEquals(2, service.timeline(1L, auth("customer")).size());
    }

    @Test
    void mediaUploadRequiresPermission() {
        Mission mission = mission();
        PermissionService permissions = mock(PermissionService.class);
        when(permissions.has(any(), eq("MISSION_MEDIA_UPLOAD"))).thenReturn(false);
        MissionServiceImpl service =
                service(
                        repository(mission),
                        mock(IMissionEventDao.class),
                        permissions,
                        mock(IMediaAssetDao.class),
                        mock(IMissionMediaDao.class));

        assertThrows(
                org.springframework.security.access.AccessDeniedException.class,
                () ->
                        service.attachMedia(
                                1L,
                                new MissionMediaRequest(5L, MediaRole.FLIGHT_DATA),
                                auth("customer")));
    }

    private MissionServiceImpl service(
            IMissionDao missions,
            IMissionEventDao events,
            PermissionService permissions,
            IMediaAssetDao media,
            IMissionMediaDao missionMedia) {
        IUserDao users = mock(IUserDao.class);
        when(users.findByUsername("customer")).thenReturn(Optional.of(mission().getCustomer()));
        return com.uav.platform.support.MissionServiceFixture.create(
                missions,
                mock(IServiceOfferingDao.class),
                users,
                permissions,
                mock(AuditLogService.class),
                events,
                mock(IStationDao.class),
                mock(IUavDao.class),
                mock(IEquipmentDao.class),
                mock(InventoryService.class),
                mock(IMissionEquipmentReservationDao.class),
                media,
                missionMedia,
                mock(com.uav.platform.service.UavService.class));
    }

    private IMissionDao repository(Mission mission) {
        IMissionDao r = mock(IMissionDao.class);
        when(r.findById(1L)).thenReturn(Optional.of(mission));
        when(r.findByIdForUpdate(1L)).thenReturn(Optional.of(mission));
        return r;
    }

    private UsernamePasswordAuthenticationToken auth(String username) {
        return UsernamePasswordAuthenticationToken.authenticated(username, "n/a", List.of());
    }

    private Mission mission() {
        AppUser customer =
                new AppUser("customer", "customer@media.vn", "hash", null, UserStatus.ACTIVE);
        Mission m =
                MissionOperations.draft(
                        customer,
                        MissionType.AREA_INSPECTION,
                        "Inspect",
                        null,
                        LocalDate.now().plusDays(1),
                        LocalDateTime.now().plusDays(1),
                        LocalDateTime.now().plusDays(1).plusHours(1),
                        "Hanoi",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        m.setId(1L);
        m.setCode("MSN-2026-000001");
        return m;
    }
}
