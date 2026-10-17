package com.uav.platform.modules.mission.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.inventory.entity.Equipment;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.inventory.enums.EquipmentType;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.service.InventoryService;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.dto.request.ResourceAssignmentRequest;
import com.uav.platform.modules.mission.entity.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.repository.*;
import com.uav.platform.modules.mission.service.impl.MissionOperations;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.enums.*;
import com.uav.platform.modules.uav.enums.UavStatus;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;

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
