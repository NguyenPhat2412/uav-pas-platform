package com.uav.platform.modules.uav;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.common.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.mission.common.MissionPriority;
import com.uav.platform.modules.mission.common.MissionType;
import com.uav.platform.modules.mission.config.request.MissionCreateRequest;
import com.uav.platform.modules.mission.config.request.ResourceAssignmentRequest;
import com.uav.platform.modules.mission.service.MissionService;
import com.uav.platform.modules.station.common.StationStatus;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.common.UavStatus;
import com.uav.platform.modules.uav.config.request.UavRequest;
import com.uav.platform.modules.uav.service.UavService;
import com.uav.platform.modules.user.common.UserRole;
import com.uav.platform.modules.user.common.UserStatus;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doThrow;

/** Service calls commit independently; assertions inspect persisted state, including rollback. */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:uav_maintenance;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class UavMaintenanceIntegrationTest {
    @Autowired UavService uavs;
    @Autowired MissionService missions;
    @Autowired StationRepository stations;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate db;
    @MockitoSpyBean AuditLogService audit;
    private Long uavId;
    private Long stationId;
    private AppUser admin;
    private AppUser customer;

    @BeforeEach
    void isolatedResources() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        admin = user("maint_admin_" + suffix, UserRole.ROLE_ADMIN);
        customer = user("maint_customer_" + suffix, UserRole.ROLE_PILOT);
        stationId = stations.save(new Station("MAINT-" + suffix, "Maintenance home", "Hanoi", null, null, StationStatus.ACTIVE)).getId();
        uavId = uavs.create(new UavRequest("Inspection UAV", "MAINT-" + suffix, "Synthetic"), admin.getUsername()).id();
        uavs.assign(uavId, stationId, admin.getUsername());
    }

    @Test
    void homeStationAssignmentDoesNotConsumeMissionAvailability() {
        assertEquals(UavStatus.AVAILABLE, uavs.get(uavId).status());
        Long missionId = pendingAssignment();
        assertEquals(uavId, missions.assignUav(missionId, new ResourceAssignmentRequest(uavId), auth(admin)).uavId());
        assertEquals(UavStatus.ASSIGNED, uavs.get(uavId).status());
    }

    @Test
    void maintenanceCyclePreventsDispatchUntilInspectionReasonIsRecorded() {
        uavs.maintenance(uavId, "Inspect rotor vibration", UavStatus.AVAILABLE, admin.getUsername());
        var maintenance = uavs.get(uavId);
        assertEquals(UavStatus.MAINTENANCE, maintenance.status());
        assertNotNull(maintenance.lastMaintenanceAt());
        Long missionId = pendingAssignment();
        assertThrows(RuntimeException.class, () -> missions.assignUav(missionId, new ResourceAssignmentRequest(uavId), auth(admin)));
        assertNull(missions.get(missionId, auth(admin)).uavId());
        var before = snapshot();
        assertThrows(SystemException.class, () -> uavs.changeStatus(uavId, UavStatus.AVAILABLE, " ", UavStatus.MAINTENANCE, admin.getUsername()));
        assertEquals(before, snapshot());

        uavs.changeStatus(uavId, UavStatus.AVAILABLE, "Rotor inspection passed", UavStatus.MAINTENANCE, admin.getUsername());

        assertEquals(UavStatus.AVAILABLE, uavs.get(uavId).status());
        assertEquals(1, count("SELECT count(*) FROM uav_status_history WHERE uav_id=? AND from_status='MAINTENANCE' AND to_status='AVAILABLE' AND reason='Rotor inspection passed'", uavId));
        assertEquals(uavId, missions.assignUav(missionId, new ResourceAssignmentRequest(uavId), auth(admin)).uavId());
    }

    @Test
    void activeMissionReferencesProtectEvenIncorrectAvailableStatus() {
        Long missionId = pendingAssignment();
        missions.assignUav(missionId, new ResourceAssignmentRequest(uavId), auth(admin));
        // Corrupt only this synthetic row to exercise defensive integrity checks.
        db.update("UPDATE uavs SET status='AVAILABLE' WHERE id=?", uavId);
        var before = snapshot();
        assertEquals("UAV_HAS_ACTIVE_MISSION", assertThrows(SystemException.class,
                () -> uavs.maintenance(uavId, "Inspection", UavStatus.AVAILABLE, admin.getUsername())).getCode());
        assertThrows(SystemException.class, () -> uavs.changeStatus(uavId, UavStatus.INACTIVE, "Retire", admin.getUsername()));
        assertThrows(SystemException.class, () -> uavs.assign(uavId, stationId, admin.getUsername()));
        assertEquals(before, snapshot());
        assertEquals(uavId, missions.get(missionId, auth(admin)).uavId());
    }

    @Test
    void maintenanceAuditFailureRollsBackStatusTimestampAndHistory() {
        var before = snapshot();
        doThrow(new IllegalStateException("Simulated audit failure"))
                .when(audit).record(isNull(), eq(admin.getUsername()), eq(AuditAction.STATUS_CHANGE),
                        eq("UAV"), eq(uavId.toString()), eq("MAINTENANCE"));
        assertThrows(IllegalStateException.class,
                () -> uavs.maintenance(uavId, "Inspect motors", UavStatus.AVAILABLE, admin.getUsername()));
        assertEquals(before, snapshot());
        assertNull(uavs.get(uavId).lastMaintenanceAt());
    }

    @Test
    void historyReasonBoundaryIsValidatedBeforeAnyWrite() {
        var before = snapshot();
        assertEquals("UAV_STATUS_REASON_TOO_LONG", assertThrows(SystemException.class,
                () -> uavs.maintenance(uavId, "x".repeat(256), UavStatus.AVAILABLE, admin.getUsername())).getCode());
        assertEquals(before, snapshot());
        uavs.maintenance(uavId, "x".repeat(255), UavStatus.AVAILABLE, admin.getUsername());
        assertEquals(1, count("SELECT count(*) FROM uav_status_history WHERE uav_id=? AND length(reason)=255", uavId));
    }

    @Test
    void inactiveFleetRecordCanBeInspectedAndReturnedWithReason() {
        uavs.changeStatus(uavId, UavStatus.INACTIVE, "Temporarily withdrawn", UavStatus.AVAILABLE, admin.getUsername());
        uavs.maintenance(uavId, "Inspect withdrawn unit", UavStatus.INACTIVE, admin.getUsername());
        uavs.changeStatus(uavId, UavStatus.AVAILABLE, "Inspection passed", UavStatus.MAINTENANCE, admin.getUsername());
        assertEquals(UavStatus.AVAILABLE, uavs.get(uavId).status());
        assertEquals(3, count("SELECT count(*) FROM audit_logs WHERE entity_type='UAV' AND entity_id=? AND action='STATUS_CHANGE'", uavId.toString()));
    }

    @Test
    void explicitOrphanRecoveryPreservesHomeStationAndAddsHistory() {
        db.update("UPDATE uavs SET status='ASSIGNED' WHERE id=?", uavId);
        assertThrows(SystemException.class, () -> uavs.changeStatus(uavId, UavStatus.AVAILABLE, "Recover legacy home station", admin.getUsername()));
        uavs.changeStatus(uavId, UavStatus.AVAILABLE, "Recover legacy home station", UavStatus.ASSIGNED, admin.getUsername());
        assertEquals(UavStatus.AVAILABLE, uavs.get(uavId).status());
        assertEquals(stationId, uavs.get(uavId).stationId());
        assertEquals(1, count("SELECT count(*) FROM uav_status_history WHERE uav_id=? AND from_status='ASSIGNED' AND to_status='AVAILABLE' AND reason='Recover legacy home station'", uavId));
    }

    @Test
    void orphanRecoveryRejectsARealMissionWithoutChangingItsResources() {
        Long missionId = pendingAssignment();
        missions.assignUav(missionId, new ResourceAssignmentRequest(uavId), auth(admin));
        var before = snapshot();
        assertEquals("UAV_HAS_ACTIVE_MISSION", assertThrows(SystemException.class,
                () -> uavs.changeStatus(uavId, UavStatus.AVAILABLE, "Attempt recovery", UavStatus.ASSIGNED, admin.getUsername())).getCode());
        assertEquals(before, snapshot());
        assertEquals(uavId, missions.get(missionId, auth(admin)).uavId());
    }

    @Test
    void concurrentCompletionWithSameExpectedStateWritesOneInspectionOnly() throws Exception {
        uavs.maintenance(uavId, "Inspect motors", UavStatus.AVAILABLE, admin.getUsername());
        var gate = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        Callable<Boolean> complete = () -> {
            gate.await();
            try {
                uavs.changeStatus(uavId, UavStatus.AVAILABLE, "Inspection passed", UavStatus.MAINTENANCE, admin.getUsername());
                return true;
            } catch (SystemException ex) {
                assertEquals("UAV_STATUS_CHANGED", ex.getCode());
                return false;
            }
        };
        try {
            var first = pool.submit(complete);
            var second = pool.submit(complete);
            gate.countDown();
            assertNotEquals(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS));
        } finally { pool.shutdownNow(); }
        assertEquals(UavStatus.AVAILABLE, uavs.get(uavId).status());
        assertEquals(1, count("SELECT count(*) FROM uav_status_history WHERE uav_id=? AND from_status='MAINTENANCE' AND to_status='AVAILABLE'", uavId));
    }

    private Long pendingAssignment() {
        LocalDateTime start = LocalDateTime.now().plusDays(3).withNano(0);
        Long id = missions.create(new MissionCreateRequest(MissionType.AREA_INSPECTION, "Maintenance dispatch test", null,
                start.toLocalDate(), start, start.plusHours(1), "Hanoi", null, null, null, MissionPriority.NORMAL, null), customer.getUsername()).id();
        missions.submit(id, auth(customer));
        missions.confirm(id, auth(admin));
        missions.assignStation(id, new ResourceAssignmentRequest(stationId), auth(admin));
        return id;
    }

    private List<?> snapshot() {
        return List.of(db.queryForMap("SELECT status, station_id, last_maintenance_at FROM uavs WHERE id=?", uavId),
                count("SELECT count(*) FROM uav_status_history WHERE uav_id=?", uavId),
                count("SELECT count(*) FROM audit_logs WHERE entity_type='UAV' AND entity_id=?", uavId.toString()));
    }
    private int count(String sql, Object id) { return db.queryForObject(sql, Integer.class, id); }
    private AppUser user(String name, UserRole role) {
        return users.save(new AppUser(name, name + "@example.invalid", "synthetic-placeholder", null, null, null, null, role, UserStatus.ACTIVE));
    }
    private UsernamePasswordAuthenticationToken auth(AppUser user) {
        return UsernamePasswordAuthenticationToken.authenticated(user.getUsername(), "n/a", List.of());
    }
}
