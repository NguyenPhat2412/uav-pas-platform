package com.uav.platform.modules.mission.service;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.common.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.PermissionService;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.service.InventoryService;
import com.uav.platform.modules.mission.config.request.MissionCompletionRequest;
import com.uav.platform.modules.mission.config.request.MissionFailureRequest;
import com.uav.platform.modules.mission.config.request.ResourceAssignmentRequest;
import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.repository.*;
import com.uav.platform.modules.mission.service.impl.IMissionService;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.common.StationStatus;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.common.UavStatus;
import com.uav.platform.modules.uav.repository.UavRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MissionExecutionTest {
    @Test
    void readyRejectsMissingResources() {
        Mission mission = missionAt(MissionStatus.RESOURCE_RESERVED);
        MissionRepository missions = repository(mission);
        when(missions.findById(1L)).thenReturn(Optional.of(mission)); when(missions.findByIdForUpdate(1L)).thenReturn(Optional.of(mission));
        MissionEquipmentReservationRepository reservations = mock(MissionEquipmentReservationRepository.class);
        when(reservations.existsByMissionIdAndReleasedFalse(1L)).thenReturn(false);
        MissionService service = service(missions, reservations, mock(UavRepository.class), mock(InventoryService.class), mock(PermissionService.class));

        assertThrows(RuntimeException.class, () -> service.ready(1L, auth("admin")));
    }

    @Test
    void startRequiresAssignedOperator() {
        Mission mission = missionAt(MissionStatus.READY);
        AppUser operator = new AppUser("operator", "operator@exec.vn", "hash", null, UserStatus.ACTIVE);
        mission.assignOperator(operator);
        mission.assignUav(new Uav("Model", "UAV-EXEC", "Maker"));
        mission.getUav().setStatus(UavStatus.ASSIGNED);
        MissionRepository missions = repository(mission);
        MissionService service = service(missions, mock(MissionEquipmentReservationRepository.class), mock(UavRepository.class),
                mock(InventoryService.class), permissions(true));

        assertThrows(RuntimeException.class, () -> service.start(1L, auth("other")));
    }

    @Test
    void completeReleasesAssignedUav() {
        Mission mission = missionAt(MissionStatus.IN_PROGRESS);
        Uav uav = new Uav("Model", "UAV-EXEC", "Maker"); uav.setStatus(UavStatus.IN_USE); mission.assignUav(uav);
        mission.assignOperator(new AppUser("operator", "operator@complete.vn", "hash", null, UserStatus.ACTIVE));
        MissionRepository missions = repository(mission);
        MissionService service = service(missions, mock(MissionEquipmentReservationRepository.class), mock(UavRepository.class),
                mock(InventoryService.class), permissions(true));

        service.complete(1L, new MissionCompletionRequest("Done", null), auth("operator"));

        assertEquals(MissionStatus.COMPLETED, mission.getStatus());
        assertEquals(UavStatus.AVAILABLE, uav.getStatus());
    }

    @Test
    void failReleasesAssignedUav() {
        Mission mission = missionAt(MissionStatus.IN_PROGRESS);
        Uav uav = new Uav("Model", "UAV-FAIL", "Maker"); uav.setStatus(UavStatus.IN_USE); mission.assignUav(uav);
        mission.assignOperator(new AppUser("operator", "operator@fail.vn", "hash", null, UserStatus.ACTIVE));
        MissionRepository missions = repository(mission);
        MissionService service = service(missions, mock(MissionEquipmentReservationRepository.class), mock(UavRepository.class),
                mock(InventoryService.class), permissions(true));

        service.fail(1L, new MissionFailureRequest("Weather", "Unsafe"), auth("operator"));

        assertEquals(MissionStatus.FAILED, mission.getStatus());
        assertEquals(UavStatus.AVAILABLE, uav.getStatus());
    }

    private MissionService service(MissionRepository missions, MissionEquipmentReservationRepository reservations,
                                   UavRepository uavs, InventoryService inventory, PermissionService permissions) {
        UserRepository users = mock(UserRepository.class);
        AppUser actor = new AppUser("operator", "actor@exec.vn", "hash", null, UserStatus.ACTIVE);
        when(users.findByUsername("operator")).thenReturn(Optional.of(actor));
        return new IMissionService(missions, mock(UavServiceRepository.class), users, permissions,
                mock(AuditLogService.class), mock(MissionEventRepository.class), mock(StationRepository.class), uavs,
                mock(EquipmentRepository.class), inventory, reservations);
    }

    private MissionRepository repository(Mission mission) { MissionRepository r = mock(MissionRepository.class); when(r.findById(1L)).thenReturn(Optional.of(mission)); when(r.findByIdForUpdate(1L)).thenReturn(Optional.of(mission)); return r; }
    private PermissionService permissions(boolean all) { PermissionService p = mock(PermissionService.class); when(p.has(any(), eq("MISSION_VIEW_ALL"))).thenReturn(all); return p; }
    private UsernamePasswordAuthenticationToken auth(String username) { return UsernamePasswordAuthenticationToken.authenticated(username, "n/a", List.of()); }
    private Mission missionAt(MissionStatus target) {
        Mission m = Mission.draft(new AppUser("customer", "customer@exec.vn", "hash", null, UserStatus.ACTIVE), MissionType.AREA_INSPECTION,
                "Inspect", null, LocalDate.now().plusDays(1), LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(1).plusHours(2),
                "Hanoi", null, null, MissionPriority.NORMAL, null);
        m.setId(1L); m.setCode("MSN-2026-000001");
        for (MissionStatus status : List.of(MissionStatus.PENDING_CONFIRMATION, MissionStatus.CONFIRMED, MissionStatus.RESOURCE_RESERVED,
                MissionStatus.READY, MissionStatus.IN_PROGRESS)) {
            if (m.getStatus() == target) break;
            m.transitionTo(status);
        }
        return m;
    }
}
