package com.uav.platform.modules.mission;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doThrow;

import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.inventory.dto.request.QuantityRequest;
import com.uav.platform.modules.inventory.entity.Equipment;
import com.uav.platform.modules.inventory.enums.EquipmentType;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.service.InventoryService;
import com.uav.platform.modules.mission.dto.request.MissionCompletionRequest;
import com.uav.platform.modules.mission.dto.request.MissionCreateRequest;
import com.uav.platform.modules.mission.dto.request.ResourceAssignmentRequest;
import com.uav.platform.modules.mission.enums.MissionPriority;
import com.uav.platform.modules.mission.enums.MissionStatus;
import com.uav.platform.modules.mission.enums.MissionType;
import com.uav.platform.modules.mission.service.MissionService;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.enums.StationStatus;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.station.service.impl.StationOperations;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.enums.UavStatus;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.support.ServicePlanTestData;

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

/** Each service call commits independently so assertions inspect persisted state and rollback. */
@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_mission_rejection;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class MissionRejectionIntegrationTest {
    @Autowired ServicePlanRepository servicePlans;
    @Autowired MissionService missions;
    @Autowired UserRepository users;
    @Autowired StationRepository stations;
    @Autowired UavRepository uavs;
    @Autowired EquipmentRepository equipment;
    @Autowired InventoryService inventory;
    @Autowired JdbcTemplate db;
    @MockitoSpyBean AuditLogService audit;

    private AppUser customer;
    private AppUser admin;
    private AppUser operator;
    private Long stationId;
    private Long uavId;
    private Long equipmentId;

    @BeforeEach
    void createIsolatedResources() {
        ServicePlanTestData.ensureBasicPlan(servicePlans);
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        customer = user("customer_" + suffix, UserRole.ROLE_PILOT);
        admin = user("admin_" + suffix, UserRole.ROLE_ADMIN);
        operator = user("operator_" + suffix, UserRole.ROLE_OPERATOR);
        Station station =
                stations.save(
                        StationOperations.create(
                                "REJ-" + suffix,
                                "Rejection test station",
                                "Hanoi",
                                null,
                                null,
                                StationStatus.ACTIVE));
        stationId = station.getId();
        Uav uav = new Uav("Test UAV", "REJ-UAV-" + suffix, "Test manufacturer");
        uav.setStation(station);
        uavId = uavs.save(uav).getId();
        equipmentId =
                equipment
                        .save(new Equipment("Battery batch", EquipmentType.BATTERY, null, station))
                        .getId();
        inventory.stockIn(equipmentId, new QuantityRequest(5, "Test stock"), admin.getUsername());
    }

    @Test
    void rejectAfterPartialAssignmentReleasesEveryReservationAndUavExactlyOnce() {
        Long missionId = partiallyAssignedMission();
        assertEquals(MissionStatus.CONFIRMED, missions.get(missionId, auth(admin)).status());
        assertEquals(3, inventory.get(equipmentId).reservedQuantity());

        var rejected = missions.reject(missionId, "Customer changed the scope", auth(admin));

        assertEquals(MissionStatus.REJECTED, rejected.status());
        assertEquals(UavStatus.AVAILABLE, uavs.findById(uavId).orElseThrow().getStatus());
        assertEquals(5, inventory.get(equipmentId).quantity());
        assertEquals(5, inventory.get(equipmentId).availableQuantity());
        assertEquals(0, inventory.get(equipmentId).reservedQuantity());
        assertEquals(
                0,
                count(
                        "SELECT count(*) FROM mission_equipment_reservations WHERE mission_id=? AND released=false",
                        missionId));
        assertEquals(
                2,
                count(
                        "SELECT count(*) FROM mission_equipment_reservations WHERE mission_id=? AND released=true AND released_at IS NOT NULL",
                        missionId));
        assertEquals(
                2,
                count(
                        "SELECT count(*) FROM inventory_movements WHERE equipment_id=? AND type='RELEASE'",
                        equipmentId));
        assertEquals(
                1,
                count(
                        "SELECT count(*) FROM uav_status_history WHERE uav_id=? AND to_status='AVAILABLE'",
                        uavId));
        assertEquals(
                1,
                count(
                        "SELECT count(*) FROM mission_events WHERE mission_id=? AND event_type='REJECTED' AND description='Customer changed the scope'",
                        missionId));
        assertEquals(
                1,
                count(
                        "SELECT count(*) FROM audit_logs WHERE entity_type='MISSION' AND entity_id=? AND details='REJECTED:Customer changed the scope'",
                        missionId.toString()));

        var afterRejection = snapshot(missionId);
        var error =
                assertThrows(
                        IllegalStateException.class,
                        () -> missions.reject(missionId, "Repeated rejection", auth(admin)));
        assertEquals("MISSION_INVALID_STATUS", error.getMessage());
        assertEquals(
                afterRejection,
                snapshot(missionId),
                "A repeated reject must not release stock or write history twice");
    }

    @Test
    void rejectBeforeResourceAssignmentKeepsStockUntouched() {
        Long missionId = pendingMission();

        assertEquals(
                MissionStatus.REJECTED,
                missions.reject(missionId, "Unsupported request", auth(admin)).status());

        assertEquals(UavStatus.AVAILABLE, uavs.findById(uavId).orElseThrow().getStatus());
        assertEquals(5, inventory.get(equipmentId).availableQuantity());
        assertEquals(0, inventory.get(equipmentId).reservedQuantity());
        assertEquals(
                0,
                count(
                        "SELECT count(*) FROM inventory_movements WHERE equipment_id=? AND type='RELEASE'",
                        equipmentId));
        assertEquals(0, count("SELECT count(*) FROM uav_status_history WHERE uav_id=?", uavId));
    }

    @Test
    void rejectFromInvalidStatusPreservesAllResourceAndHistoryRecords() {
        Long missionId = partiallyAssignedMission();
        missions.assignOperator(
                missionId, new ResourceAssignmentRequest(operator.getId()), auth(admin));
        assertEquals(
                MissionStatus.RESOURCE_RESERVED, missions.get(missionId, auth(admin)).status());
        var before = snapshot(missionId);

        var error =
                assertThrows(
                        IllegalStateException.class,
                        () -> missions.reject(missionId, "Too late to reject", auth(admin)));

        assertEquals("MISSION_INVALID_STATUS", error.getMessage());
        assertEquals(before, snapshot(missionId));
    }

    @Test
    void auditFailureRollsBackRejectionResourceReleaseAndTimelineTogether() {
        Long missionId = partiallyAssignedMission();
        var before = snapshot(missionId);
        doThrow(new IllegalStateException("Simulated audit persistence failure"))
                .when(audit)
                .record(
                        isNull(),
                        eq(admin.getUsername()),
                        eq(AuditAction.STATUS_CHANGE),
                        eq("MISSION"),
                        eq(missionId.toString()),
                        eq("REJECTED:Audit rollback"));

        var error =
                assertThrows(
                        IllegalStateException.class,
                        () -> missions.reject(missionId, "Audit rollback", auth(admin)));

        assertEquals("Simulated audit persistence failure", error.getMessage());
        assertEquals(
                before,
                snapshot(missionId),
                "Resource release must share the rejection transaction");
        assertEquals(
                0,
                count(
                        "SELECT count(*) FROM inventory_movements WHERE equipment_id=? AND type='RELEASE'",
                        equipmentId));
        assertEquals(
                0,
                count(
                        "SELECT count(*) FROM mission_events WHERE mission_id=? AND event_type='REJECTED'",
                        missionId));
        assertEquals(
                0,
                count(
                        "SELECT count(*) FROM uav_status_history WHERE uav_id=? AND to_status='AVAILABLE'",
                        uavId));
    }

    @Test
    void rejectNoteBeyondTimelineCapacityRollsBack() {
        Long missionId = partiallyAssignedMission();
        var before = snapshot(missionId);

        assertThrows(
                IllegalArgumentException.class,
                () -> missions.reject(missionId, "x".repeat(501), auth(admin)));

        assertEquals(before, snapshot(missionId));
        assertEquals(
                MissionStatus.REJECTED,
                missions.reject(missionId, "x".repeat(500), auth(admin)).status());
    }

    @Test
    void operatorConflictNoteBeyondTimelineCapacityRollsBack() {
        Long missionId = partiallyAssignedMission();
        missions.assignOperator(
                missionId, new ResourceAssignmentRequest(operator.getId()), auth(admin));
        var before = snapshot(missionId);

        assertThrows(
                IllegalArgumentException.class,
                () -> missions.reportOperatorConflict(missionId, "x".repeat(501), auth(operator)));

        assertEquals(before, snapshot(missionId));
        assertNull(missions.get(missionId, auth(admin)).operatorConflictNote());
        assertEquals(
                500,
                missions.reportOperatorConflict(missionId, "x".repeat(500), auth(operator))
                        .operatorConflictNote()
                        .length());
    }

    @Test
    void completionNoteBeyondTimelineCapacityRollsBack() {
        Long missionId = partiallyAssignedMission();
        missions.assignOperator(
                missionId, new ResourceAssignmentRequest(operator.getId()), auth(admin));
        MissionHandoverTestData.accept(missions, missionId, auth(operator));
        missions.ready(missionId, auth(admin));
        missions.start(missionId, auth(operator));
        MissionHandoverTestData.result(db, missionId, operator.getUsername());
        var before = snapshot(missionId);

        assertThrows(
                com.uav.platform.error.SystemException.class,
                () ->
                        missions.complete(
                                missionId,
                                new MissionCompletionRequest("x".repeat(501), "Intact"),
                                auth(operator)));

        assertEquals(before, snapshot(missionId));
        assertNull(missions.get(missionId, auth(admin)).completionNote());
        var completed =
                missions.complete(
                        missionId,
                        new MissionCompletionRequest("x".repeat(500), "Intact"),
                        auth(operator));
        assertEquals(MissionStatus.COMPLETED, completed.status());
        assertEquals(500, completed.completionNote().length());
    }

    private Long pendingMission() {
        LocalDateTime start = LocalDateTime.now().plusDays(3).withNano(0);
        Long id =
                missions.create(
                                new MissionCreateRequest(
                                        MissionType.AREA_INSPECTION,
                                        "Rejection regression",
                                        null,
                                        start.toLocalDate(),
                                        start,
                                        start.plusHours(1),
                                        "Hanoi",
                                        null,
                                        null,
                                        null,
                                        MissionPriority.NORMAL,
                                        null),
                                customer.getUsername())
                        .id();
        missions.submit(id, auth(customer));
        return id;
    }

    private Long partiallyAssignedMission() {
        Long id = pendingMission();
        missions.confirm(id, auth(admin));
        missions.assignStation(id, new ResourceAssignmentRequest(stationId), auth(admin));
        missions.assignUav(id, new ResourceAssignmentRequest(uavId), auth(admin));
        missions.reserveEquipment(
                id, new ResourceAssignmentRequest(equipmentId, 1, "First allocation"), auth(admin));
        missions.reserveEquipment(
                id,
                new ResourceAssignmentRequest(equipmentId, 2, "Additional allocation"),
                auth(admin));
        // No operator: this intentionally remains CONFIRMED, where rejection is allowed.
        return id;
    }

    private List<?> snapshot(Long missionId) {
        return List.of(
                db.queryForMap("SELECT status, version FROM missions WHERE id=?", missionId),
                db.queryForMap("SELECT status FROM uavs WHERE id=?", uavId),
                db.queryForMap(
                        "SELECT quantity, available_quantity, reserved_quantity, version FROM equipment WHERE id=?",
                        equipmentId),
                db.queryForList(
                        "SELECT id, released, released_at FROM mission_equipment_reservations WHERE mission_id=? ORDER BY id",
                        missionId),
                count("SELECT count(*) FROM mission_events WHERE mission_id=?", missionId),
                count("SELECT count(*) FROM inventory_movements WHERE equipment_id=?", equipmentId),
                count("SELECT count(*) FROM uav_status_history WHERE uav_id=?", uavId),
                count(
                        "SELECT count(*) FROM audit_logs WHERE actor_username=?",
                        admin.getUsername()));
    }

    private int count(String sql, Object id) {
        return db.queryForObject(sql, Integer.class, id);
    }

    private AppUser user(String username, UserRole role) {
        return users.save(
                new AppUser(
                        username,
                        username + "@test.invalid",
                        "test-placeholder",
                        null,
                        null,
                        null,
                        null,
                        role,
                        UserStatus.ACTIVE));
    }

    private UsernamePasswordAuthenticationToken auth(AppUser user) {
        return UsernamePasswordAuthenticationToken.authenticated(
                user.getUsername(), "n/a", List.of());
    }
}
