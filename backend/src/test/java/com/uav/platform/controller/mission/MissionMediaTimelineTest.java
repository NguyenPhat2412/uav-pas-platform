package com.uav.platform.controller.mission;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.mission.MissionMediaRequest;
import com.uav.platform.entity.mission.*;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.inventory.EquipmentRepository;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.mission.*;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.mission.MissionOperations;
import com.uav.platform.service.impl.mission.MissionServiceImpl;
import com.uav.platform.service.inventory.InventoryService;
import com.uav.platform.service.permission.PermissionService;

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
        MissionRepository missions = repository(mission);
        MissionEventRepository events = mock(MissionEventRepository.class);
        when(events.findByMissionIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(created, started));
        MissionServiceImpl service =
                service(
                        missions,
                        events,
                        mock(PermissionService.class),
                        mock(MediaAssetRepository.class),
                        mock(MissionMediaRepository.class));

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
                        mock(MissionEventRepository.class),
                        permissions,
                        mock(MediaAssetRepository.class),
                        mock(MissionMediaRepository.class));

        assertThrows(
                org.springframework.security.access.AccessDeniedException.class,
                () ->
                        service.attachMedia(
                                1L,
                                new MissionMediaRequest(5L, MediaRole.FLIGHT_DATA),
                                auth("customer")));
    }

    private MissionServiceImpl service(
            MissionRepository missions,
            MissionEventRepository events,
            PermissionService permissions,
            MediaAssetRepository media,
            MissionMediaRepository missionMedia) {
        UserRepository users = mock(UserRepository.class);
        when(users.findByUsername("customer")).thenReturn(Optional.of(mission().getCustomer()));
        return com.uav.platform.support.MissionServiceFixture.create(
                missions,
                mock(ServiceOfferingRepository.class),
                users,
                permissions,
                mock(AuditLogService.class),
                events,
                mock(StationRepository.class),
                mock(UavRepository.class),
                mock(EquipmentRepository.class),
                mock(InventoryService.class),
                mock(MissionEquipmentReservationRepository.class),
                media,
                missionMedia,
                mock(com.uav.platform.service.uav.UavService.class));
    }

    private MissionRepository repository(Mission mission) {
        MissionRepository r = mock(MissionRepository.class);
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
