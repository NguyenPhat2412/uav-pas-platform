package com.uav.platform.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.*;
import com.uav.platform.dao.IEquipmentDao;
import com.uav.platform.dao.IStationDao;
import com.uav.platform.dao.IUavDao;
import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dto.request.ResourceAssignmentRequest;
import com.uav.platform.entity.*;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Equipment;
import com.uav.platform.entity.Uav;
import com.uav.platform.enums.*;
import com.uav.platform.enums.EquipmentType;
import com.uav.platform.enums.UavStatus;
import com.uav.platform.enums.UserStatus;
import com.uav.platform.service.impl.MissionOperations;

import org.junit.jupiter.api.Test;
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
        IMissionDao missions = repository(mission);
        IUavDao uavs = mock(IUavDao.class);
        when(uavs.findByIdForUpdate(3L)).thenReturn(Optional.of(uav));

        MissionService service =
                service(
                        missions,
                        uavs,
                        mock(IStationDao.class),
                        mock(IEquipmentDao.class),
                        mock(InventoryService.class));
        assertThrows(RuntimeException.class, () -> service.assignUav(1L, 3L, auth()));
    }

    @Test
    void overlappingUavIsRejected() {
        Mission mission = mission();
        Uav uav = new Uav("Model", "UAV-1", "Maker");
        uav.setId(3L);
        IMissionDao missions = repository(mission);
        IUavDao uavs = mock(IUavDao.class);
        when(uavs.findByIdForUpdate(3L)).thenReturn(Optional.of(uav));
        when(missions.exists(any(HibernateSpecification.class))).thenReturn(true);

        MissionService service =
                service(
                        missions,
                        uavs,
                        mock(IStationDao.class),
                        mock(IEquipmentDao.class),
                        mock(InventoryService.class));
        assertThrows(RuntimeException.class, () -> service.assignUav(1L, 3L, auth()));
    }

    @Test
    void unavailableEquipmentIsRejected() {
        Mission mission = mission();
        Equipment equipment = new Equipment("Battery", EquipmentType.BATTERY, "BAT-1", null);
        equipment.setId(5L);
        IMissionDao missions = repository(mission);
        IEquipmentDao equipmentRepository = mock(IEquipmentDao.class);
        when(equipmentRepository.findById(5L)).thenReturn(Optional.of(equipment));
        InventoryService inventory = mock(InventoryService.class);

        MissionService service =
                service(
                        missions,
                        mock(IUavDao.class),
                        mock(IStationDao.class),
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
            IMissionDao missions,
            IUavDao uavs,
            IStationDao stations,
            IEquipmentDao equipment,
            InventoryService inventory) {
        return com.uav.platform.support.MissionServiceFixture.create(
                missions,
                mock(IServiceOfferingDao.class),
                mock(IUserDao.class),
                mock(PermissionService.class),
                mock(AuditLogService.class),
                mock(IMissionEventDao.class),
                stations,
                uavs,
                equipment,
                inventory,
                mock(IMissionEquipmentReservationDao.class));
    }

    private IMissionDao repository(Mission mission) {
        IMissionDao repository = mock(IMissionDao.class);
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
