package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.response.MissionDispatchCandidatesResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Equipment;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionEquipmentReservation;
import com.uav.platform.entity.Station;
import com.uav.platform.entity.Uav;
import com.uav.platform.entity.UavTelemetry;
import com.uav.platform.enums.EquipmentStatus;
import com.uav.platform.enums.EquipmentType;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.enums.StationStatus;
import com.uav.platform.enums.UavStatus;
import com.uav.platform.enums.UserRole;
import com.uav.platform.service.MissionResourceService;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

class MissionSmartDispatchOperationsCoverageTest {

    private Station station(Long id, String code, StationStatus status, Double lat, Double lng) {
        Station s = new Station();
        s.setId(id);
        s.setCode(code);
        s.setName("Station " + code);
        s.setStatus(status);
        s.setLatitude(lat);
        s.setLongitude(lng);
        return s;
    }

    private Uav uav(Long id, String sn, UavStatus status, Station st, LocalDateTime lastMaint) {
        Uav u = new Uav("M350", sn, "DJI");
        u.setId(id);
        u.setStatus(status);
        u.setStation(st);
        u.setLastMaintenanceAt(lastMaint);
        return u;
    }

    private Equipment equipment(
            Long id,
            String name,
            EquipmentType type,
            EquipmentStatus status,
            int avail,
            Station st) {
        Equipment e = new Equipment(name, type, null, st);
        e.setId(id);
        e.setStatus(status);
        e.setAvailableQuantity(avail);
        return e;
    }

    private AppUser operator(Long id, String username, String fullName, UserRole role) {
        AppUser u = new AppUser();
        u.setId(id);
        u.setUsername(username);
        u.setFullName(fullName);
        u.setRole(role);
        return u;
    }

    @Test
    void parseOperatorCountsAndRatingsHandleNullAndValidRows() {
        assertTrue(MissionSmartDispatchOperations.parseOperatorCounts(null).isEmpty());
        assertTrue(MissionSmartDispatchOperations.parseOperatorRatings(null).isEmpty());

        List<Object[]> rows =
                List.of(new Object[] {1L, 5L}, new Object[] {"bad"}, new Object[] {2, 4.66});
        assertEquals(5L, MissionSmartDispatchOperations.parseOperatorCounts(rows).get(1L));
        assertEquals(4.7, MissionSmartDispatchOperations.parseOperatorRatings(rows).get(2L));
    }

    @Test
    void evaluateCandidatesCoversStationConflictAndAllResourceReasons() {
        Station s1 = station(1L, "S1", StationStatus.ACTIVE, 21.0285, 105.8542); // ~0 km
        Station s2 = station(2L, "S2", StationStatus.ACTIVE, 21.1200, 105.8542); // ~10 km
        Station s3 = station(3L, "S3", StationStatus.ACTIVE, 21.3000, 105.8542); // ~30 km
        Station s4 = station(4L, "S4", StationStatus.ACTIVE, 21.6000, 105.8542); // ~63 km
        Station s5 = station(5L, "S5", StationStatus.ACTIVE, 22.2000, 105.8542); // >80 km
        Station sInactive = station(6L, "S6", StationStatus.INACTIVE, null, null);

        Uav uAssigned = uav(10L, "SN-10", UavStatus.IN_USE, s2, LocalDateTime.now().minusDays(10));
        Uav uAvail = uav(11L, "SN-11", UavStatus.AVAILABLE, s1, LocalDateTime.now().minusDays(45));
        Uav uMaint =
                uav(12L, "SN-12", UavStatus.MAINTENANCE, s1, LocalDateTime.now().minusDays(90));
        Uav uRepair = uav(13L, "SN-13", UavStatus.AVAILABLE, s1, null);
        Uav uInactiveSt = uav(14L, "SN-14", UavStatus.AVAILABLE, sInactive, null);
        Uav uUnstationed = uav(15L, "SN-15", UavStatus.AVAILABLE, null, null);

        Equipment eqRes =
                equipment(20L, "Cam", EquipmentType.CAMERA, EquipmentStatus.ACTIVE, 2, s3);
        Equipment eqInactive = equipment(21L, "Old", null, EquipmentStatus.INACTIVE, 1, s1);
        Equipment eqInactiveSt =
                equipment(
                        22L, "StOff", EquipmentType.BATTERY, EquipmentStatus.ACTIVE, 1, sInactive);
        Equipment eqOut =
                equipment(23L, "Empty", EquipmentType.SENSOR, EquipmentStatus.ACTIVE, 0, s1);
        Equipment eqUnstationed =
                equipment(24L, "Spare", EquipmentType.ACCESSORY, EquipmentStatus.ACTIVE, 3, null);

        MissionEquipmentReservation res = new MissionEquipmentReservation();
        res.setEquipment(eqRes);

        AppUser opActive = operator(30L, "op1", "  ", UserRole.ROLE_OPERATOR);
        AppUser opInactive = operator(31L, "op2", "Inactive Op", UserRole.ROLE_OPERATOR);
        AppUser opBusy = operator(32L, "op3", "Busy Op", UserRole.ROLE_OPERATOR);
        AppUser admin = operator(33L, "adm", "Admin", UserRole.ROLE_ADMIN);

        LocalDate day = LocalDate.of(2026, 5, 10);
        LocalDateTime start = day.atTime(9, 0);
        LocalDateTime end = day.atTime(11, 0);

        Mission target = new Mission();
        target.setId(100L);
        target.setCode("MIS-100");
        target.setStatus(MissionStatus.CONFIRMED);
        target.setLatitude(new BigDecimal("21.0285"));
        target.setLongitude(new BigDecimal("105.8542"));
        target.setRequestedDate(day);
        target.setStartTime(start);
        target.setExpectedEndTime(end);
        target.setStation(s1);
        target.setUav(uAssigned); // binds s2 -> triggers stationConflict with s1 and s3!
        target.setOperator(opActive);

        Mission otherMission = new Mission();
        otherMission.setId(101L);
        otherMission.setStatus(MissionStatus.READY);
        otherMission.setUav(uUnstationed);
        otherMission.setOperator(opBusy);
        otherMission.setRequestedDate(day);
        otherMission.setStartTime(day.atTime(10, 0));
        otherMission.setExpectedEndTime(day.atTime(12, 0));

        UavTelemetry tel = new UavTelemetry();
        tel.setUavId(11L);
        tel.setBatteryPct(55);

        MissionResourceService resources = mock(MissionResourceService.class);
        when(resources.eligibleOperator(opActive)).thenReturn(true);
        when(resources.eligibleOperator(opInactive)).thenReturn(false);
        when(resources.eligibleOperator(opBusy)).thenReturn(true);

        MissionDispatchCandidatesResponse resp =
                MissionSmartDispatchOperations.evaluateCandidates(
                        target,
                        List.of(s1, s2, s3, s4, s5, sInactive),
                        List.of(uAssigned, uAvail, uMaint, uRepair, uInactiveSt, uUnstationed),
                        List.of(eqRes, eqInactive, eqInactiveSt, eqOut, eqUnstationed),
                        List.of(opActive, opInactive, opBusy, admin),
                        List.of(target, otherMission),
                        Map.of(30L, 4L),
                        Map.of(30L, 4.8),
                        List.of(res),
                        List.of(tel),
                        Set.of(13L),
                        List.of(MissionStatus.COMPLETED, MissionStatus.CANCELLED),
                        resources);

        assertNull(resp.recommendedStationId());
        assertEquals(10L, resp.recommendedUavId());
        assertEquals(30L, resp.recommendedOperatorId());
        assertNull(resp.recommendedEquipmentId());
        assertFalse(resp.canAutoAssign());

        assertTrue(resp.stations().stream().anyMatch(sc -> "INACTIVE".equals(sc.reason())));
        assertTrue(resp.stations().stream().anyMatch(sc -> "STATION_CONFLICT".equals(sc.reason())));
        assertTrue(
                resp.uavs().stream()
                        .anyMatch(uc -> "UAV_STATUS_MAINTENANCE".equals(uc.conflictReason())));
        assertTrue(
                resp.uavs().stream()
                        .anyMatch(uc -> "OPEN_REPAIR_ORDER".equals(uc.conflictReason())));
        assertTrue(
                resp.uavs().stream()
                        .anyMatch(uc -> "STATION_INACTIVE".equals(uc.conflictReason())));
        assertTrue(
                resp.uavs().stream()
                        .anyMatch(uc -> "STATION_CONFLICT".equals(uc.conflictReason())));
        assertTrue(
                resp.operators().stream()
                        .anyMatch(oc -> "ACCOUNT_INACTIVE".equals(oc.conflictReason())));
        assertTrue(
                resp.operators().stream()
                        .anyMatch(oc -> "TIME_CONFLICT".equals(oc.conflictReason())));
        assertTrue(resp.operators().stream().anyMatch(oc -> "op1".equals(oc.fullName())));
        assertTrue(resp.equipment().stream().anyMatch(ec -> "INACTIVE".equals(ec.reason())));
        assertTrue(
                resp.equipment().stream().anyMatch(ec -> "STATION_INACTIVE".equals(ec.reason())));
        assertTrue(resp.equipment().stream().anyMatch(ec -> "OUT_OF_STOCK".equals(ec.reason())));
        assertTrue(
                resp.equipment().stream().anyMatch(ec -> "STATION_CONFLICT".equals(ec.reason())));
    }

    @Test
    void evaluateCandidatesCoversStationLockMismatchAndAutoDispatchReady() {
        Station s1 = station(1L, "S1", StationStatus.ACTIVE, 21.0285, 105.8542);
        Station s2 = station(2L, "S2", StationStatus.ACTIVE, 21.0500, 105.8600);

        Uav u1 = uav(10L, "SN-10", UavStatus.AVAILABLE, s1, LocalDateTime.now().minusDays(5));
        Uav u2 = uav(11L, "SN-11", UavStatus.AVAILABLE, s2, LocalDateTime.now().minusDays(5));
        Uav uOtherBusy =
                uav(12L, "SN-12", UavStatus.AVAILABLE, s1, LocalDateTime.now().minusDays(5));
        Uav uFreeUnstationed = uav(13L, "SN-13", UavStatus.AVAILABLE, null, null);

        Equipment eq1 =
                equipment(20L, "Bat1", EquipmentType.BATTERY, EquipmentStatus.ACTIVE, 3, s1);
        Equipment eq2 =
                equipment(21L, "Bat2", EquipmentType.BATTERY, EquipmentStatus.ACTIVE, 3, s2);
        Equipment eqFree =
                equipment(22L, "BatFree", EquipmentType.BATTERY, EquipmentStatus.ACTIVE, 2, null);

        AppUser op1 = operator(30L, "op1", "Pilot One", UserRole.ROLE_OPERATOR);

        LocalDate day = LocalDate.of(2026, 5, 12);
        Mission target = new Mission();
        target.setId(200L);
        target.setCode("MIS-200");
        target.setStatus(MissionStatus.RESOURCE_RESERVED);
        target.setRequestedDate(day);
        target.setStartTime(day.atTime(8, 0));
        target.setExpectedEndTime(day.atTime(10, 0));
        target.setStation(s1);

        // Another active mission holding uOtherBusy and scheduled on same day for op1
        // (non-overlapping)
        Mission mBusy = new Mission();
        mBusy.setId(201L);
        mBusy.setStatus(MissionStatus.CONFIRMED);
        mBusy.setUav(uOtherBusy);
        mBusy.setOperator(op1);
        mBusy.setRequestedDate(day);
        mBusy.setStartTime(day.atTime(14, 0));
        mBusy.setExpectedEndTime(day.atTime(16, 0));

        // Excluded mission should not conflict
        Mission mDone = new Mission();
        mDone.setId(202L);
        mDone.setStatus(MissionStatus.COMPLETED);
        mDone.setUav(u1);
        mDone.setOperator(op1);
        mDone.setRequestedDate(day);
        mDone.setStartTime(day.atTime(8, 0));
        mDone.setExpectedEndTime(day.atTime(10, 0));

        MissionResourceService resources = mock(MissionResourceService.class);
        when(resources.eligibleOperator(op1)).thenReturn(true);

        MissionDispatchCandidatesResponse resp =
                MissionSmartDispatchOperations.evaluateCandidates(
                        target,
                        List.of(s1, s2),
                        List.of(u1, u2, uOtherBusy, uFreeUnstationed),
                        List.of(eq1, eq2, eqFree),
                        List.of(op1),
                        List.of(mBusy, mDone),
                        Map.of(),
                        Map.of(),
                        List.of(),
                        null,
                        Set.of(),
                        List.of(MissionStatus.COMPLETED),
                        resources);

        assertEquals(1L, resp.recommendedStationId());
        assertNotNull(resp.recommendedUavId());
        assertEquals(30L, resp.recommendedOperatorId());
        assertEquals(20L, resp.recommendedEquipmentId());
        assertTrue(resp.canAutoAssign());

        assertTrue(resp.stations().stream().anyMatch(sc -> "STATION_LOCKED".equals(sc.reason())));
        assertTrue(
                resp.uavs().stream()
                        .anyMatch(uc -> "UAV_IN_OTHER_MISSION".equals(uc.conflictReason())));
        assertTrue(
                resp.uavs().stream()
                        .anyMatch(uc -> "STATION_MISMATCH".equals(uc.conflictReason())));
        assertTrue(
                resp.equipment().stream().anyMatch(ec -> "STATION_MISMATCH".equals(ec.reason())));
        assertEquals(1, resp.operators().get(0).sameDayMissionCount());
    }
}
