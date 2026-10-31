package com.uav.platform.integration.mission;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doThrow;

import com.uav.platform.dto.request.inventory.QuantityRequest;
import com.uav.platform.dto.request.mission.*;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.entity.station.Station;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.inventory.EquipmentType;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.StationStatus;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.billing.ServicePlanRepository;
import com.uav.platform.repository.inventory.EquipmentRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.station.StationOperations;
import com.uav.platform.service.inventory.InventoryService;
import com.uav.platform.service.mission.MissionService;
import com.uav.platform.service.uav.UavService;
import com.uav.platform.support.ServicePlanTestData;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

/** Independently committed service calls verify actual persistence, rollback, and contending transactions. */
@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:uav_redispatch;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;LOCK_TIMEOUT=10000")
class MissionRedispatchIntegrationTest {
    @Autowired ServicePlanRepository servicePlans;
    @Autowired MissionService missions;
    @Autowired UserRepository users;
    @Autowired StationRepository stations;
    @Autowired UavRepository uavs;
    @Autowired UavService uavService;
    @Autowired EquipmentRepository equipment;
    @Autowired InventoryService inventory;
    @Autowired JdbcTemplate db;
    @MockitoSpyBean AuditLogService audit;
    private AppUser customer, admin, operator;
    private Station station;
    private Long previousId, replacementId, equipmentId;
    private String suffix;

    @BeforeEach
    void fixture() {
        ServicePlanTestData.ensureBasicPlan(servicePlans);
        suffix = UUID.randomUUID().toString().substring(0, 8);
        customer = user("dispatch_customer_", UserRole.ROLE_PILOT);
        admin = user("dispatch_admin_", UserRole.ROLE_ADMIN);
        operator = user("dispatch_operator_", UserRole.ROLE_OPERATOR);
        station =
                stations.save(
                        StationOperations.create(
                                "DSP-" + suffix,
                                "Dispatch station",
                                "Hanoi",
                                null,
                                null,
                                StationStatus.ACTIVE));
        previousId = uav("old", station);
        replacementId = uav("new", station);
        equipmentId =
                equipment
                        .save(
                                new Equipment(
                                        "Dispatch battery", EquipmentType.BATTERY, null, station))
                        .getId();
        inventory.stockIn(equipmentId, new QuantityRequest(8, "Fixture"), admin.getUsername());
    }

    @Test
    void replacingReadyUavPreservesOtherResourcesAndRequiresReadyAgain() {
        Long id = allocated(previousId, true);
        missions.acceptOperator(
                id,
                new com.uav.platform.dto.request.mission.MissionAcceptanceRequest(
                        missions.get(id, auth(operator)).version()),
                auth(operator));
        MissionHandoverTestData.accept(missions, id, auth(operator));
        missions.ready(id, auth(admin));
        var result =
                missions.replaceUav(
                        id, replace(previousId, replacementId, "r".repeat(500)), auth(admin));
        assertEquals(MissionStatus.RESOURCE_RESERVED, result.status());
        assertEquals(replacementId, result.uavId());
        assertEquals(station.getId(), result.stationId());
        assertEquals(operator.getId(), result.operatorId());
        assertFalse(result.operatorAccepted());
        assertNull(result.operatorConflictNote());
        assertEquals(2, inventory.get(equipmentId).reservedQuantity());
        assertEquals(UavStatus.AVAILABLE, status(previousId));
        assertEquals(UavStatus.ASSIGNED, status(replacementId));
        var event =
                missions.timeline(id, auth(admin)).stream()
                        .filter(e -> e.eventType() == MissionEventType.UAV_REPLACED)
                        .findFirst()
                        .orElseThrow();
        assertEquals(500, event.description().length());
        assertTrue(event.metadata().contains("\"previousUavId\":" + previousId));
        assertTrue(event.metadata().contains("\"replacementUavId\":" + replacementId));
        assertThrows(IllegalStateException.class, () -> missions.start(id, auth(operator)));
        MissionHandoverTestData.accept(missions, id, auth(operator));
        missions.ready(id, auth(admin));
        missions.start(id, auth(operator));
        MissionHandoverTestData.result(db, id, operator.getUsername());
        missions.complete(id, new MissionCompletionRequest("Done", "Intact"), auth(operator));
        assertEquals(UavStatus.AVAILABLE, status(replacementId));
        assertEquals(0, inventory.get(equipmentId).reservedQuantity());
    }

    @Test
    void unassignIsAtomicRetainsEquipmentAndDuplicateIsStale() {
        Long id = allocated(previousId, true);
        missions.acceptOperator(
                id,
                new com.uav.platform.dto.request.mission.MissionAcceptanceRequest(
                        missions.get(id, auth(operator)).version()),
                auth(operator));
        MissionHandoverTestData.accept(missions, id, auth(operator));
        missions.ready(id, auth(admin));
        var result =
                missions.unassignUav(
                        id,
                        new MissionUavUnassignmentRequest(previousId, "Inspect aircraft"),
                        auth(admin));
        assertEquals(MissionStatus.CONFIRMED, result.status());
        assertNull(result.uavId());
        assertFalse(result.operatorAccepted());
        assertEquals(operator.getId(), result.operatorId());
        assertEquals(2, inventory.get(equipmentId).reservedQuantity());
        assertEquals(UavStatus.AVAILABLE, status(previousId));
        var before = snapshot(id);
        var stale =
                assertThrows(
                        SystemException.class,
                        () ->
                                missions.unassignUav(
                                        id,
                                        new MissionUavUnassignmentRequest(previousId, "Again"),
                                        auth(admin)));
        assertEquals("MISSION_UAV_ASSIGNMENT_STALE", stale.getCode());
        assertEquals(before, snapshot(id));
        missions.assignUav(id, new ResourceAssignmentRequest(replacementId), auth(admin));
        assertEquals(MissionStatus.RESOURCE_RESERVED, missions.get(id, auth(admin)).status());
        assertEquals(2, inventory.get(equipmentId).reservedQuantity());
    }

    @Test
    void staleReplacementCannotOverwriteCurrentAssignment() {
        Long id = allocated(previousId, false);
        missions.replaceUav(id, replace(previousId, replacementId, "Swap"), auth(admin));
        var before = snapshot(id);
        var ex =
                assertThrows(
                        SystemException.class,
                        () ->
                                missions.replaceUav(
                                        id,
                                        replace(previousId, uav("third", station), "Stale tab"),
                                        auth(admin)));
        assertEquals("MISSION_UAV_ASSIGNMENT_STALE", ex.getCode());
        assertEquals(before, snapshot(id));
    }

    @Test
    void unavailableWrongStationInactiveStationAndMissingReplacementDoNotReleaseOriginal() {
        Long id = allocated(previousId, false);
        var before = snapshot(id);
        uavService.maintenance(replacementId, admin.getUsername());
        assertThrows(
                SystemException.class,
                () ->
                        missions.replaceUav(
                                id,
                                replace(previousId, replacementId, "Maintenance candidate"),
                                auth(admin)));
        var other =
                stations.save(
                        StationOperations.create(
                                "DSP-OTHER-" + suffix,
                                "Other",
                                null,
                                null,
                                null,
                                StationStatus.ACTIVE));
        Long wrongStation = uav("otherstation", other);
        assertThrows(
                SystemException.class,
                () ->
                        missions.replaceUav(
                                id,
                                replace(previousId, wrongStation, "Wrong station"),
                                auth(admin)));
        db.update("UPDATE uav_stations SET status='INACTIVE' WHERE id=?", station.getId());
        Long inactive = uav("inactive", station);
        assertThrows(
                SystemException.class,
                () ->
                        missions.replaceUav(
                                id,
                                replace(previousId, inactive, "Inactive station"),
                                auth(admin)));
        assertThrows(
                SystemException.class,
                () ->
                        missions.replaceUav(
                                id,
                                replace(previousId, Long.MAX_VALUE, "Missing UAV"),
                                auth(admin)));
        assertEquals(before.get(0), snapshot(id).get(0));
        assertEquals(UavStatus.ASSIGNED, status(previousId));
        assertEquals(
                0,
                count(
                        "SELECT count(*) FROM mission_events WHERE mission_id=? AND event_type='UAV_REPLACED'",
                        id));
    }

    @Test
    void sameUavBlankAndOversizedReasonsAndInvalidIdsAreRejected() {
        Long id = allocated(previousId, false);
        var before = snapshot(id);
        assertThrows(
                SystemException.class,
                () ->
                        missions.replaceUav(
                                id, replace(previousId, previousId, "Same"), auth(admin)));
        for (String reason : List.of(" ", "x".repeat(501))) {
            assertThrows(
                    SystemException.class,
                    () ->
                            missions.replaceUav(
                                    id, replace(previousId, replacementId, reason), auth(admin)));
        }
        assertThrows(
                SystemException.class,
                () ->
                        missions.unassignUav(
                                id,
                                new MissionUavUnassignmentRequest(0L, "Invalid expected"),
                                auth(admin)));
        assertThrows(
                SystemException.class,
                () ->
                        missions.replaceUav(
                                id, replace(previousId, -1L, "Invalid replacement"), auth(admin)));
        assertEquals(before, snapshot(id));
    }

    @Test
    void futureNonOverlappingOwnerStillBlocksAvailableCorruptedCandidate() {
        Long id = allocated(previousId, false);
        Long future = confirmed(30);
        missions.assignUav(future, new ResourceAssignmentRequest(replacementId), auth(admin));
        // Models a legacy inconsistency: status alone must not make an actively owned aircraft
        // assignable.
        db.update("UPDATE uavs SET status='AVAILABLE' WHERE id=?", replacementId);
        var before = snapshot(id);
        var ex =
                assertThrows(
                        SystemException.class,
                        () ->
                                missions.replaceUav(
                                        id,
                                        replace(previousId, replacementId, "Existing future owner"),
                                        auth(admin)));
        assertEquals("UAV_NOT_AVAILABLE", ex.getCode());
        assertEquals(before, snapshot(id));
        assertEquals(replacementId, missions.get(future, auth(admin)).uavId());
    }

    @Test
    void oldAircraftOwnedElsewhereIsNeverReleasedByRedispatchOrTerminalRelease() {
        Long id = allocated(previousId, false);
        Long other = confirmed(30);
        db.update("UPDATE missions SET uav_id=? WHERE id=?", previousId, other);
        missions.replaceUav(
                id,
                replace(previousId, replacementId, "Correct old duplicate ownership"),
                auth(admin));
        assertEquals(UavStatus.ASSIGNED, status(previousId));
        assertEquals(previousId, missions.get(other, auth(admin)).uavId());
        Long third = confirmed(31);
        db.update("UPDATE missions SET uav_id=? WHERE id=?", replacementId, third);
        missions.cancel(id, auth(admin));
        assertEquals(UavStatus.ASSIGNED, status(replacementId));
    }

    @Test
    void inProgressAndEveryTerminalStatusRejectRedispatchWithoutWrites() {
        for (MissionStatus blocked :
                List.of(
                        MissionStatus.IN_PROGRESS,
                        MissionStatus.COMPLETED,
                        MissionStatus.FAILED,
                        MissionStatus.CANCELLED,
                        MissionStatus.REJECTED,
                        MissionStatus.DRAFT,
                        MissionStatus.PENDING_CONFIRMATION)) {
            Long aircraft = uav("blocked" + blocked, station);
            Long id = allocated(aircraft, false);
            db.update("UPDATE missions SET status=? WHERE id=?", blocked.name(), id);
            var before =
                    db.queryForMap("SELECT status,uav_id,version FROM missions WHERE id=?", id);
            assertThrows(
                    SystemException.class,
                    () ->
                            missions.replaceUav(
                                    id, replace(aircraft, replacementId, "Blocked"), auth(admin)));
            assertThrows(
                    SystemException.class,
                    () ->
                            missions.unassignUav(
                                    id,
                                    new MissionUavUnassignmentRequest(aircraft, "Blocked"),
                                    auth(admin)));
            assertEquals(
                    before,
                    db.queryForMap("SELECT status,uav_id,version FROM missions WHERE id=?", id));
            assertEquals(UavStatus.ASSIGNED, status(aircraft));
        }
    }

    @Test
    void customerAndOperatorCannotRedispatchEvenTheirOwnMission() {
        Long id = allocated(previousId, true);
        for (AppUser actor : List.of(customer, operator)) {
            assertThrows(
                    AccessDeniedException.class,
                    () ->
                            missions.replaceUav(
                                    id,
                                    replace(previousId, replacementId, "Not allowed"),
                                    auth(actor)));
            assertThrows(
                    AccessDeniedException.class,
                    () ->
                            missions.unassignUav(
                                    id,
                                    new MissionUavUnassignmentRequest(previousId, "Not allowed"),
                                    auth(actor)));
        }
        assertEquals(previousId, missions.get(id, auth(admin)).uavId());
    }

    @Test
    void auditFailureRollsBackAssignmentStatusHistoryAcceptanceAndTimeline() {
        Long id = allocated(previousId, true);
        missions.acceptOperator(
                id,
                new com.uav.platform.dto.request.mission.MissionAcceptanceRequest(
                        missions.get(id, auth(operator)).version()),
                auth(operator));
        MissionHandoverTestData.accept(missions, id, auth(operator));
        missions.ready(id, auth(admin));
        var before = snapshot(id);
        doThrow(new IllegalStateException("Injected dispatch audit failure"))
                .when(audit)
                .record(
                        isNull(),
                        eq(admin.getUsername()),
                        eq(AuditAction.ASSIGN),
                        eq("MISSION"),
                        eq(id.toString()),
                        startsWith("UAV_REPLACED:"));
        assertThrows(
                IllegalStateException.class,
                () ->
                        missions.replaceUav(
                                id, replace(previousId, replacementId, "Rollback"), auth(admin)));
        assertEquals(before, snapshot(id));
    }

    @Test
    void competingReplacementsOnSameMissionHaveExactlyOneWinner() throws Exception {
        Long id = allocated(previousId, false);
        Long third = uav("third", station);
        var results =
                race(
                        () ->
                                missions.replaceUav(
                                        id,
                                        replace(previousId, replacementId, "Race A"),
                                        auth(admin)),
                        () ->
                                missions.replaceUav(
                                        id, replace(previousId, third, "Race B"), auth(admin)));
        assertEquals(1, results.stream().filter(Objects::isNull).count());
        assertEquals(
                1,
                results.stream()
                        .filter(
                                e ->
                                        e instanceof SystemException se
                                                && "MISSION_UAV_ASSIGNMENT_STALE"
                                                        .equals(se.getCode()))
                        .count());
        assertEquals(
                1,
                count(
                        "SELECT count(*) FROM mission_events WHERE mission_id=? AND event_type='UAV_REPLACED'",
                        id));
        assertEquals(UavStatus.AVAILABLE, status(previousId));
        assertEquals(
                1,
                List.of(status(replacementId), status(third)).stream()
                        .filter(s -> s == UavStatus.ASSIGNED)
                        .count());
    }

    @Test
    void competingMissionsCannotBothClaimOneReplacement() throws Exception {
        Long idA = allocated(previousId, false);
        Long oldB = uav("oldB", station);
        Long idB = allocated(oldB, false);
        var results =
                race(
                        () ->
                                missions.replaceUav(
                                        idA,
                                        replace(previousId, replacementId, "Mission A"),
                                        auth(admin)),
                        () ->
                                missions.replaceUav(
                                        idB,
                                        replace(oldB, replacementId, "Mission B"),
                                        auth(admin)));
        assertEquals(1, results.stream().filter(Objects::isNull).count());
        assertEquals(1, count("SELECT count(*) FROM missions WHERE uav_id=?", replacementId));
        assertEquals(UavStatus.ASSIGNED, status(replacementId));
    }

    @Test
    void assignmentAndMaintenanceRaceNeverProduceAssignedMaintenanceAircraft() throws Exception {
        Long id = confirmed(3);
        var results =
                race(
                        () ->
                                missions.assignUav(
                                        id,
                                        new ResourceAssignmentRequest(replacementId),
                                        auth(admin)),
                        () -> uavService.maintenance(replacementId, admin.getUsername()));
        assertEquals(1, results.stream().filter(Objects::isNull).count());
        var mission = missions.get(id, auth(admin));
        if (mission.uavId() == null) assertEquals(UavStatus.MAINTENANCE, status(replacementId));
        else {
            assertEquals(replacementId, mission.uavId());
            assertEquals(UavStatus.ASSIGNED, status(replacementId));
        }
    }

    @Test
    void unassignmentAndCancellationNeverDoubleReleaseEquipmentOrUav() throws Exception {
        Long id = allocated(previousId, true);
        var results =
                race(
                        () ->
                                missions.unassignUav(
                                        id,
                                        new MissionUavUnassignmentRequest(previousId, "Unassign"),
                                        auth(admin)),
                        () -> missions.cancel(id, auth(admin)));
        assertTrue(results.stream().anyMatch(Objects::isNull));
        assertEquals(MissionStatus.CANCELLED, missions.get(id, auth(admin)).status());
        assertEquals(UavStatus.AVAILABLE, status(previousId));
        assertEquals(0, inventory.get(equipmentId).reservedQuantity());
        assertEquals(
                1,
                count(
                        "SELECT count(*) FROM uav_status_history WHERE uav_id=? AND to_status='AVAILABLE'",
                        previousId));
        assertEquals(
                1,
                count(
                        "SELECT count(*) FROM inventory_movements WHERE equipment_id=? AND type='RELEASE'",
                        equipmentId));
    }

    @Test
    void executionAndTerminalMissionsRejectAcceptanceAndConflictWithoutChangingHistory() {
        Long id = allocated(previousId, true);
        missions.acceptOperator(
                id,
                new com.uav.platform.dto.request.mission.MissionAcceptanceRequest(
                        missions.get(id, auth(operator)).version()),
                auth(operator));
        MissionHandoverTestData.accept(missions, id, auth(operator));
        missions.ready(id, auth(admin));
        missions.start(id, auth(operator));
        for (MissionStatus blocked :
                List.of(
                        MissionStatus.IN_PROGRESS,
                        MissionStatus.COMPLETED,
                        MissionStatus.CANCELLED,
                        MissionStatus.FAILED,
                        MissionStatus.REJECTED)) {
            db.update("UPDATE missions SET status=? WHERE id=?", blocked.name(), id);
            var before = snapshot(id);
            assertThrows(
                    IllegalStateException.class,
                    () ->
                            missions.acceptOperator(
                                    id,
                                    new com.uav.platform.dto.request.mission
                                            .MissionAcceptanceRequest(
                                            missions.get(id, auth(operator)).version()),
                                    auth(operator)),
                    blocked.name());
            assertThrows(
                    IllegalStateException.class,
                    () -> missions.reportOperatorConflict(id, "Late conflict", auth(operator)),
                    blocked.name());
            assertEquals(before, snapshot(id));
        }
    }

    @Test
    void acceptanceAndConflictRemainAvailableDuringEveryPreflightState() {
        Long id = allocated(previousId, true);
        for (MissionStatus allowed :
                List.of(
                        MissionStatus.CONFIRMED,
                        MissionStatus.RESOURCE_RESERVED,
                        MissionStatus.READY)) {
            db.update("UPDATE missions SET status=? WHERE id=?", allowed.name(), id);
            assertTrue(
                    missions.acceptOperator(
                                    id,
                                    new com.uav.platform.dto.request.mission
                                            .MissionAcceptanceRequest(
                                            missions.get(id, auth(operator)).version()),
                                    auth(operator))
                            .operatorAccepted());
            var conflict = missions.reportOperatorConflict(id, "Recheck dispatch", auth(operator));
            assertFalse(conflict.operatorAccepted());
            assertEquals("Recheck dispatch", conflict.operatorConflictNote());
        }
    }

    @Test
    void duplicateLegacyOwnershipCannotMarkReadyOrStartTheAircraft() {
        Long id = allocated(previousId, true);
        Long other = confirmed(30);
        db.update("UPDATE missions SET uav_id=? WHERE id=?", previousId, other);
        var before = snapshot(id);
        assertThrows(SystemException.class, () -> missions.ready(id, auth(admin)));
        assertEquals(before, snapshot(id));
        db.update("UPDATE missions SET status='READY' WHERE id=?", id);
        var ready = snapshot(id);
        assertThrows(SystemException.class, () -> missions.start(id, auth(operator)));
        assertEquals(ready, snapshot(id));
        assertEquals(UavStatus.ASSIGNED, status(previousId));
    }

    private List<Throwable> race(Callable<?> left, Callable<?> right) throws Exception {
        var pool = Executors.newFixedThreadPool(2);
        var gate = new CountDownLatch(1);
        try {
            var futures = new ArrayList<Future<Throwable>>();
            for (Callable<?> action : List.of(left, right))
                futures.add(
                        pool.submit(
                                () -> {
                                    gate.await();
                                    try {
                                        action.call();
                                        return null;
                                    } catch (Throwable ex) {
                                        return ex;
                                    }
                                }));
            gate.countDown();
            var results = new ArrayList<Throwable>();
            for (var future : futures) results.add(future.get(25, TimeUnit.SECONDS));
            assertTrue(
                    results.stream()
                            .allMatch(
                                    e ->
                                            e == null
                                                    || e instanceof SystemException
                                                    || e instanceof IllegalStateException),
                    () -> "Unexpected concurrency failures: " + results);
            return results;
        } finally {
            pool.shutdownNow();
        }
    }

    private Long confirmed(int days) {
        LocalDateTime start = LocalDateTime.now().plusDays(days).withNano(0);
        Long id =
                missions.create(
                                new MissionCreateRequest(
                                        MissionType.AREA_INSPECTION,
                                        "Dispatch regression",
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
        missions.confirm(id, auth(admin));
        missions.assignStation(id, new ResourceAssignmentRequest(station.getId()), auth(admin));
        return id;
    }

    private Long allocated(Long uavId, boolean all) {
        Long id = confirmed(3);
        missions.assignUav(id, new ResourceAssignmentRequest(uavId), auth(admin));
        if (all) {
            missions.assignOperator(
                    id, new ResourceAssignmentRequest(operator.getId()), auth(admin));
            missions.reserveEquipment(
                    id,
                    new ResourceAssignmentRequest(equipmentId, 2, "Fixture reservation"),
                    auth(admin));
        }
        return id;
    }

    private List<?> snapshot(Long id) {
        return List.of(
                db.queryForMap(
                        "SELECT status,uav_id,station_id,operator_id,operator_accepted,operator_conflict_note,version FROM missions WHERE id=?",
                        id),
                db.queryForMap("SELECT status FROM uavs WHERE id=?", previousId),
                db.queryForMap("SELECT status FROM uavs WHERE id=?", replacementId),
                db.queryForList(
                        "SELECT quantity,released FROM mission_equipment_reservations WHERE mission_id=? ORDER BY id",
                        id),
                count("SELECT count(*) FROM mission_events WHERE mission_id=?", id),
                count(
                        "SELECT count(*) FROM uav_status_history WHERE uav_id IN (?,"
                                + replacementId
                                + ")",
                        previousId),
                count(
                        "SELECT count(*) FROM audit_logs WHERE actor_username=?",
                        admin.getUsername()));
    }

    private MissionUavReplacementRequest replace(Long expected, Long replacement, String reason) {
        return new MissionUavReplacementRequest(expected, replacement, reason);
    }

    private int count(String sql, Object arg) {
        return db.queryForObject(sql, Integer.class, arg);
    }

    private UavStatus status(Long id) {
        return uavs.findById(id).orElseThrow().getStatus();
    }

    private Long uav(String name, Station home) {
        Uav uav = new Uav("Dispatch test", "DSP-" + suffix + "-" + name, "Test");
        uav.setStation(home);
        return uavs.save(uav).getId();
    }

    private AppUser user(String name, UserRole role) {
        String username = name + suffix;
        return users.save(
                new AppUser(
                        username,
                        username + "@example.invalid",
                        "fixture-placeholder",
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
