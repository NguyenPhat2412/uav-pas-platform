package com.uav.platform.service.mission;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.mission.ResourceAssignmentRequest;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.entity.mission.*;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.inventory.EquipmentType;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.inventory.EquipmentRepository;
import com.uav.platform.repository.mission.*;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.mission.MissionOperations;
import com.uav.platform.service.inventory.InventoryService;
import com.uav.platform.service.permission.PermissionService;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

class MissionAssignmentTest {
    @Test
    void maintenanceUavIsRejected() {
        Mission mission = mission();
        Uav uav = new Uav("Model", "UAV-1", "Maker");
        uav.setId(3L);
        uav.setStatus(UavStatus.MAINTENANCE);
        MissionRepository missions = repository(mission);
        UavRepository uavs = mock(UavRepository.class);
        when(uavs.findByIdForUpdate(3L)).thenReturn(Optional.of(uav));

        MissionService service =
                service(
                        missions,
                        uavs,
                        mock(StationRepository.class),
                        mock(EquipmentRepository.class),
                        mock(InventoryService.class));
        assertThrows(RuntimeException.class, () -> service.assignUav(1L, 3L, auth()));
    }

    @Test
    void overlappingUavIsRejected() {
        Mission mission = mission();
        Uav uav = new Uav("Model", "UAV-1", "Maker");
        uav.setId(3L);
        MissionRepository missions = repository(mission);
        UavRepository uavs = mock(UavRepository.class);
        when(uavs.findByIdForUpdate(3L)).thenReturn(Optional.of(uav));
        when(missions.exists(any(Specification.class))).thenReturn(true);

        MissionService service =
                service(
                        missions,
                        uavs,
                        mock(StationRepository.class),
                        mock(EquipmentRepository.class),
                        mock(InventoryService.class));
        assertThrows(RuntimeException.class, () -> service.assignUav(1L, 3L, auth()));
    }

    @Test
    void unavailableEquipmentIsRejected() {
        Mission mission = mission();
        Equipment equipment = new Equipment("Battery", EquipmentType.BATTERY, "BAT-1", null);
        equipment.setId(5L);
        MissionRepository missions = repository(mission);
        EquipmentRepository equipmentRepository = mock(EquipmentRepository.class);
        when(equipmentRepository.findById(5L)).thenReturn(Optional.of(equipment));
        InventoryService inventory = mock(InventoryService.class);

        MissionService service =
                service(
                        missions,
                        mock(UavRepository.class),
                        mock(StationRepository.class),
                        equipmentRepository,
                        inventory);
        assertThrows(
                RuntimeException.class,
                () ->
                        service.reserveEquipment(
                                1L, new ResourceAssignmentRequest(5L, 1, null), auth()));
        verify(inventory, never()).reserve(anyLong(), any(), anyString());
    }

    private MissionService service(
            MissionRepository missions,
            UavRepository uavs,
            StationRepository stations,
            EquipmentRepository equipment,
            InventoryService inventory) {
        return com.uav.platform.support.MissionServiceFixture.create(
                missions,
                mock(ServiceOfferingRepository.class),
                mock(UserRepository.class),
                mock(PermissionService.class),
                mock(AuditLogService.class),
                mock(MissionEventRepository.class),
                stations,
                uavs,
                equipment,
                inventory,
                mock(MissionEquipmentReservationRepository.class));
    }

    private MissionRepository repository(Mission mission) {
        MissionRepository repository = mock(MissionRepository.class);
        when(repository.findById(1L)).thenReturn(Optional.of(mission));
        when(repository.findByIdForUpdate(1L)).thenReturn(Optional.of(mission));
        return repository;
    }

    private Mission mission() {
        Mission mission =
                MissionOperations.draft(
                        new AppUser(
                                "customer", "customer@assign.vn", "hash", null, UserStatus.ACTIVE),
                        MissionType.AREA_INSPECTION,
                        "Inspect",
                        null,
                        LocalDate.now().plusDays(1),
                        LocalDateTime.now().plusDays(1),
                        LocalDateTime.now().plusDays(1).plusHours(2),
                        "Hanoi",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        mission.setId(1L);
        mission.setCode("MSN-2026-000001");
        return mission;
    }

    private UsernamePasswordAuthenticationToken auth() {
        return UsernamePasswordAuthenticationToken.authenticated("admin", "n/a", List.of());
    }
}
