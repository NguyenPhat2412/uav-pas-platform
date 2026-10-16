package com.uav.platform.modules.mission;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.common.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.inventory.common.EquipmentType;
import com.uav.platform.modules.inventory.config.request.QuantityRequest;
import com.uav.platform.modules.inventory.entity.Equipment;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.service.InventoryService;
import com.uav.platform.modules.mission.common.*;
import com.uav.platform.modules.mission.config.request.*;
import com.uav.platform.modules.mission.service.MissionService;
import com.uav.platform.modules.station.common.StationStatus;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.common.UavStatus;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.repository.UavRepository;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doThrow;

/** Independently committed service calls verify actual persistence, rollback, and contending transactions. */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:resource_redispatch;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;LOCK_TIMEOUT=10000")
class MissionResourceRedispatchIntegrationTest {
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
        suffix = UUID.randomUUID().toString().substring(0, 8);
        customer = user("dispatch_customer_", UserRole.ROLE_PILOT);
        admin = user("dispatch_admin_", UserRole.ROLE_ADMIN);
        operator = user("dispatch_operator_", UserRole.ROLE_OPERATOR);
        station = stations.save(new Station("DSP-" + suffix, "Dispatch station", "Hanoi", null, null, StationStatus.ACTIVE));
        previousId = uav("old", station);
        replacementId = uav("new", station);
        equipmentId = equipment.save(new Equipment("Dispatch battery", EquipmentType.BATTERY, null, station)).getId();
        inventory.stockIn(equipmentId, new QuantityRequest(8, "Fixture"), admin.getUsername());
    }

    @Test
    void lockedOperatorCannotBeAssigned() {
        Long id = confirmed(3);
        db.update("UPDATE users SET manual_locked=true WHERE id=?", operator.getId());
        assertThrows(SystemException.class, () -> missions.assignOperator(id, new ResourceAssignmentRequest(operator.getId()), auth(admin)));
    }

    @Test
    void customerCannotBeAssignedAsOperator() {
        Long id = confirmed(3);
        assertThrows(SystemException.class, () -> missions.assignOperator(id, new ResourceAssignmentRequest(customer.getId()), auth(admin)));
    }

    @Test
    void readyRequiresAtLeastOneActiveReservation() {
        Long id = allocated(previousId, true);
        db.update("UPDATE mission_equipment_reservations SET released=true WHERE mission_id=?", id);
        assertThrows(SystemException.class, () -> missions.ready(id, auth(admin)));
    }

    @Test
    void readyRejectsOperatorLockedAfterAssignment() {
        Long id = allocated(previousId, true);
        db.update("UPDATE users SET manual_locked=true WHERE id=?", operator.getId());
        assertThrows(SystemException.class, () -> missions.ready(id, auth(admin)));
    }

    @Test
    void startRechecksStationAfterReady() {
        Long id = allocated(previousId, true);
        MissionHandoverTestData.accept(missions,id,auth(operator));
        missions.ready(id, auth(admin));
        db.update("UPDATE uav_stations SET status='INACTIVE' WHERE id=?", station.getId());
        assertThrows(SystemException.class, () -> missions.start(id, auth(operator)));
    }

    @Test
    void operatorReplacementResetsAcceptanceAndRequiresReadyAgain() {
        Long id = allocated(previousId, true);
        AppUser replacement = user("replacement_", UserRole.ROLE_OPERATOR);
        missions.acceptOperator(id, new com.uav.platform.modules.mission.config.request.MissionAcceptanceRequest(missions.get(id, auth(operator)).version()), auth(operator)); missions.ready(id, auth(admin));
        var result = missions.redispatchOperator(id, change(id, replacement.getId()), auth(admin));
        assertEquals(replacement.getId(), result.operatorId());
        assertFalse(result.operatorAccepted()); assertNull(result.operatorConflictNote());
        assertEquals(MissionStatus.RESOURCE_RESERVED, result.status());
        assertThrows(AccessDeniedException.class, () -> missions.start(id, auth(operator)));
        assertThrows(IllegalStateException.class, () -> missions.start(id, auth(replacement)));
        missions.acceptOperator(id, new com.uav.platform.modules.mission.config.request.MissionAcceptanceRequest(missions.get(id, auth(replacement)).version()), auth(replacement)); missions.ready(id, auth(admin)); missions.start(id, auth(replacement));
        MissionHandoverTestData.result(db,id,replacement.getUsername());
        missions.complete(id, new MissionCompletionRequest("Done", "Intact"), auth(replacement));
        assertEquals(0, inventory.get(equipmentId).reservedQuantity());
        assertEquals(1, count("SELECT count(*) FROM mission_events WHERE mission_id=? AND event_type='OPERATOR_REPLACED'", id));
    }

    @Test
    void unassignOperatorFreesScheduleAndStaleVersionCannotOverwrite() {
        Long id = allocated(previousId, true);
        var old = change(id, null);
        var result = missions.redispatchOperator(id, old, auth(admin));
        assertNull(result.operatorId()); assertEquals(MissionStatus.CONFIRMED, result.status());
        Long other = confirmed(3);
        missions.assignOperator(other, new ResourceAssignmentRequest(operator.getId()), auth(admin));
        assertThrows(SystemException.class, () -> missions.redispatchOperator(id, old, auth(admin)));
        assertThrows(SystemException.class, () -> missions.redispatchOperator(id, change(id, operator.getId()), auth(admin)));
    }

    @Test
    void overlapRejectedButAdjacentWindowAllowedAndOwnMissionExcluded() {
        Long id = allocated(previousId, true);
        AppUser replacement = user("other_operator_", UserRole.ROLE_OPERATOR);
        Long other = confirmed(3);
        missions.assignOperator(other, new ResourceAssignmentRequest(replacement.getId()), auth(admin));
        assertEquals("OPERATOR_TIME_CONFLICT", assertThrows(SystemException.class,
                () -> missions.redispatchOperator(id, change(id, replacement.getId()), auth(admin))).getCode());
        var end = missions.get(id, auth(admin)).expectedEndTime();
        db.update("UPDATE missions SET start_time=?,expected_end_time=? WHERE id=?", end, end.plusHours(1), other);
        missions.redispatchOperator(id, change(id, replacement.getId()), auth(admin));
        MissionHandoverTestData.accept(missions,id,auth(replacement));
        missions.ready(id, auth(admin));
        assertEquals(MissionStatus.READY, missions.get(id, auth(admin)).status());
    }

    @Test
    void competingDispatchAndLegacyAssignmentCannotDoubleBookOperator() throws Exception {
        Long a = allocated(previousId, false), b = confirmed(3);
        var results = race(() -> missions.redispatchOperator(a, change(a, operator.getId()), auth(admin)),
                () -> missions.assignOperator(b, new ResourceAssignmentRequest(operator.getId()), auth(admin)));
        assertEquals(1, results.stream().filter(Objects::isNull).count());
        assertEquals(1, count("SELECT count(*) FROM missions WHERE operator_id=?", operator.getId()));
    }

    @Test
    void stationChangeRequiresExplicitReleaseAndRetainsOperator() {
        Long id = allocated(previousId, true);
        Station target = stations.save(new Station("NEW-" + suffix, "New station", null, null, null, StationStatus.ACTIVE));
        var before = snapshot(id);
        assertEquals("MISSION_STATION_RESOURCES_CONFLICT", assertThrows(SystemException.class,
                () -> missions.redispatchStation(id, change(id, target.getId()), auth(admin))).getCode());
        assertEquals(before, snapshot(id));
        missions.unassignUav(id, new MissionUavUnassignmentRequest(previousId, "Move base"), auth(admin));
        assertThrows(SystemException.class, () -> missions.redispatchStation(id, change(id, target.getId()), auth(admin)));
        missions.redispatchEquipment(id, equipmentChange(id, reservation(id), null, null), auth(admin));
        var result = missions.redispatchStation(id, change(id, target.getId()), auth(admin));
        assertEquals(target.getId(), result.stationId()); assertEquals(operator.getId(), result.operatorId());
        assertEquals(MissionStatus.CONFIRMED, result.status()); assertEquals(0, inventory.get(equipmentId).reservedQuantity());
        assertNull(missions.redispatchStation(id, change(id, null), auth(admin)).stationId());
        missions.assignStation(id, new ResourceAssignmentRequest(station.getId()), auth(admin));
    }

    @Test
    void stationReplacementCannotBypassRedispatchOrUseInactiveStation() {
        Long id = confirmed(3);
        Station target = stations.save(new Station("OFF-" + suffix, "Inactive", null, null, null, StationStatus.INACTIVE));
        assertThrows(SystemException.class, () -> missions.assignStation(id, new ResourceAssignmentRequest(target.getId()), auth(admin)));
        assertThrows(SystemException.class, () -> missions.redispatchStation(id, change(id, target.getId()), auth(admin)));
        assertEquals(station.getId(), missions.get(id, auth(admin)).stationId());
    }

    @Test
    void equipmentDecreaseReplaceAndReturnPreserveBalancesAndHistory() {
        Long id = allocated(previousId, true);
        MissionHandoverTestData.accept(missions,id,auth(operator));
        missions.ready(id, auth(admin));
        Long original = reservation(id);
        var saved = missions.redispatchEquipment(id, equipmentChange(id, original, equipmentId, 1), auth(admin));
        assertEquals(MissionStatus.RESOURCE_RESERVED, saved.status());
        assertEquals(1, inventory.get(equipmentId).reservedQuantity());
        assertEquals(1, count("SELECT count(*) FROM mission_equipment_reservations WHERE id=? AND released=true", original));
        Long alternate = equipment.save(new Equipment("Replacement battery", EquipmentType.BATTERY, null, station)).getId();
        inventory.stockIn(alternate, new QuantityRequest(5, "Fixture"), admin.getUsername());
        missions.redispatchEquipment(id, equipmentChange(id, reservation(id), alternate, 3), auth(admin));
        assertEquals(0, inventory.get(equipmentId).reservedQuantity()); assertEquals(3, inventory.get(alternate).reservedQuantity());
        MissionHandoverTestData.accept(missions,id,auth(operator));
        missions.ready(id, auth(admin)); missions.start(id, auth(operator));
        MissionHandoverTestData.result(db,id,operator.getUsername());
        missions.complete(id, new MissionCompletionRequest("Done", "Intact"), auth(operator));
        assertEquals(0, inventory.get(alternate).reservedQuantity());
        assertEquals(2, count("SELECT count(*) FROM inventory_movements WHERE equipment_id=? AND type='RELEASE'", equipmentId));
        assertEquals(1, count("SELECT count(*) FROM inventory_movements WHERE equipment_id=? AND type='RELEASE'", alternate));
    }

    @Test
    void duplicateReturnAndForeignReservationCannotAffectOtherMission() {
        Long id = allocated(previousId, true), other = confirmed(3);
        missions.reserveEquipment(other, new ResourceAssignmentRequest(equipmentId, 3, "Other"), auth(admin));
        Long original = reservation(id);
        var old = equipmentChange(id, original, null, null);
        assertThrows(SystemException.class, () -> missions.redispatchEquipment(id, equipmentChange(id, reservation(other), null, null), auth(admin)));
        missions.redispatchEquipment(id, old, auth(admin));
        assertThrows(SystemException.class, () -> missions.redispatchEquipment(id, old, auth(admin)));
        assertThrows(SystemException.class, () -> missions.redispatchEquipment(id, equipmentChange(id, original, null, null), auth(admin)));
        assertEquals(3, inventory.get(equipmentId).reservedQuantity());
        assertEquals(1, count("SELECT count(*) FROM inventory_movements WHERE equipment_id=? AND type='RELEASE'", equipmentId));
    }

    @Test
    void genericInventoryReleaseCannotConsumeMissionReservations() {
        Long id = allocated(previousId, true);
        assertEquals("MISSION_EQUIPMENT_RELEASE_REQUIRED", assertThrows(SystemException.class,
                () -> inventory.release(equipmentId, new QuantityRequest(1, "Bypass"), admin.getUsername())).getCode());
        inventory.reserve(equipmentId, new QuantityRequest(1, "Manual"), admin.getUsername());
        inventory.release(equipmentId, new QuantityRequest(1, "Manual return"), admin.getUsername());
        assertEquals(2, inventory.get(equipmentId).reservedQuantity());
        assertEquals(1, missions.dispatchResources(id, auth(admin)).reservations().size());
    }

    @Test
    void sameEquipmentQuantityChangeInvalidatesStaleFormEvenWhenMissionStateUnchanged() {
        Long id = allocated(previousId, true);
        var old = change(id, null);
        missions.redispatchEquipment(id, equipmentChange(id, reservation(id), equipmentId, 3), auth(admin));
        assertEquals("MISSION_DISPATCH_STALE", assertThrows(SystemException.class,
                () -> missions.redispatchOperator(id, old, auth(admin))).getCode());
        assertEquals(operator.getId(), missions.get(id, auth(admin)).operatorId());
    }

    @Test
    void legacyReservationAlsoInvalidatesOpenForm() {
        Long id = allocated(previousId, true);
        var old = change(id, null);
        missions.reserveEquipment(id, new ResourceAssignmentRequest(equipmentId, 1, "Extra"), auth(admin));
        assertThrows(SystemException.class, () -> missions.redispatchOperator(id, old, auth(admin)));
    }

    @Test
    void quantityUnavailableOrWrongStationRollsBackEntireReplacement() {
        Long id = allocated(previousId, true);
        var before = snapshot(id); Long original = reservation(id);
        assertThrows(SystemException.class, () -> missions.redispatchEquipment(id, equipmentChange(id, original, equipmentId, 99), auth(admin)));
        Station other = stations.save(new Station("E-" + suffix, "Elsewhere", null, null, null, StationStatus.ACTIVE));
        Long wrong = equipment.save(new Equipment("Wrong base", EquipmentType.BATTERY, null, other)).getId();
        inventory.stockIn(wrong, new QuantityRequest(5, "Fixture"), admin.getUsername());
        before = snapshot(id);
        assertThrows(SystemException.class, () -> missions.redispatchEquipment(id, equipmentChange(id, original, wrong, 1), auth(admin)));
        assertEquals(before, snapshot(id)); assertEquals(2, inventory.get(equipmentId).reservedQuantity());
        assertEquals(0, inventory.get(wrong).reservedQuantity());
    }

    @Test
    void auditFailureRollsBackReleaseReservationVersionAndEvent() {
        Long id = allocated(previousId, true); Long original = reservation(id);
        var before = snapshot(id); long version = version(id);
        doThrow(new IllegalStateException("Audit unavailable")).when(audit).record(isNull(), eq(admin.getUsername()), eq(AuditAction.ASSIGN), eq("MISSION"), eq(id.toString()), startsWith("EQUIPMENT_RELEASED"));
        assertThrows(IllegalStateException.class, () -> missions.redispatchEquipment(id, equipmentChange(id, original, null, null), auth(admin)));
        assertEquals(before, snapshot(id)); assertEquals(version, version(id));
        assertEquals(2, inventory.get(equipmentId).reservedQuantity()); assertEquals(original, reservation(id));
    }

    @Test
    void returnAndCancellationRaceReleasesExactlyOnce() throws Exception {
        Long id = allocated(previousId, true); var change = equipmentChange(id, reservation(id), null, null);
        race(() -> missions.redispatchEquipment(id, change, auth(admin)), () -> missions.cancel(id, auth(admin)));
        assertEquals(MissionStatus.CANCELLED, missions.get(id, auth(admin)).status());
        assertEquals(0, inventory.get(equipmentId).reservedQuantity());
        assertEquals(1, count("SELECT count(*) FROM inventory_movements WHERE equipment_id=? AND type='RELEASE'", equipmentId));
    }

    @Test
    void competingQuantityChangesApplyOnlyOneSnapshot() throws Exception {
        Long id = allocated(previousId, true); Long original = reservation(id); long version = version(id);
        var outcomes = race(
                () -> missions.redispatchEquipment(id, new MissionEquipmentRedispatchRequest(version, original, equipmentId, 3, "A"), auth(admin)),
                () -> missions.redispatchEquipment(id, new MissionEquipmentRedispatchRequest(version, original, equipmentId, 4, "B"), auth(admin)));
        assertEquals(1, outcomes.stream().filter(Objects::isNull).count());
        assertTrue(List.of(3, 4).contains(inventory.get(equipmentId).reservedQuantity()));
        assertEquals(1, count("SELECT count(*) FROM inventory_movements WHERE equipment_id=? AND type='RELEASE'", equipmentId));
    }

    @Test
    void allRedispatchCommandsRejectMissingPermissionAndEveryNonPreflightState() {
        Long id = allocated(previousId, true); var resource = change(id, null); var item = equipmentChange(id, reservation(id), null, null);
        assertThrows(AccessDeniedException.class, () -> missions.redispatchOperator(id, resource, auth(customer)));
        assertThrows(AccessDeniedException.class, () -> missions.redispatchStation(id, resource, auth(customer)));
        assertThrows(AccessDeniedException.class, () -> missions.redispatchEquipment(id, item, auth(customer)));
        AppUser stranger = user("stranger_", UserRole.ROLE_PILOT);
        assertThrows(AccessDeniedException.class, () -> missions.dispatchResources(id, auth(stranger)));
        for (String state : List.of("DRAFT", "PENDING_CONFIRMATION", "IN_PROGRESS", "COMPLETED", "CANCELLED", "FAILED", "REJECTED")) {
            db.update("UPDATE missions SET status=? WHERE id=?", state, id); var before = snapshot(id);
            assertThrows(SystemException.class, () -> missions.redispatchOperator(id, resource, auth(admin)));
            assertThrows(SystemException.class, () -> missions.redispatchStation(id, resource, auth(admin)));
            assertThrows(SystemException.class, () -> missions.redispatchEquipment(id, item, auth(admin)));
            assertEquals(before, snapshot(id));
        }
    }

    @Test
    void inactiveEquipmentBlocksReadyAndStart() {
        Long id = allocated(previousId, true);
        db.update("UPDATE equipment SET status='MAINTENANCE' WHERE id=?", equipmentId);
        assertThrows(SystemException.class, () -> missions.ready(id, auth(admin)));
        db.update("UPDATE missions SET status='READY' WHERE id=?", id);
        assertThrows(SystemException.class, () -> missions.start(id, auth(operator)));
        assertEquals(UavStatus.ASSIGNED, status(previousId));
    }

    @Test
    void inconsistentReservedBalanceNeverConsumesAnotherMissionsAllocation() {
        Long id = allocated(previousId, true), other = confirmed(3);
        missions.reserveEquipment(other, new ResourceAssignmentRequest(equipmentId, 2, "Other"), auth(admin));
        db.update("UPDATE equipment SET reserved_quantity=2, available_quantity=quantity-2 WHERE id=?", equipmentId);
        assertEquals("MISSION_RESERVATION_BALANCE_CONFLICT", assertThrows(SystemException.class,
                () -> missions.redispatchEquipment(id, equipmentChange(id, reservation(id), null, null), auth(admin))).getCode());
        assertEquals(2, inventory.get(equipmentId).reservedQuantity());
        assertEquals(0, count("SELECT count(*) FROM inventory_movements WHERE equipment_id=? AND type='RELEASE'", equipmentId));
    }

    @Test
    void competingMissionsCannotOverReserveOneReplacementStock() throws Exception {
        Long a = allocated(previousId, true), b = confirmed(3);
        missions.reserveEquipment(b, new ResourceAssignmentRequest(equipmentId, 2, "Other"), auth(admin));
        Long alternate = equipment.save(new Equipment("Shared replacement", EquipmentType.BATTERY, null, station)).getId();
        inventory.stockIn(alternate, new QuantityRequest(3, "Fixture"), admin.getUsername());
        var requestA = equipmentChange(a, reservation(a), alternate, 3);
        var requestB = equipmentChange(b, reservation(b), alternate, 3);
        var outcomes = race(() -> missions.redispatchEquipment(a, requestA, auth(admin)), () -> missions.redispatchEquipment(b, requestB, auth(admin)));
        assertEquals(1, outcomes.stream().filter(Objects::isNull).count());
        assertEquals(3, inventory.get(alternate).reservedQuantity());
        assertEquals(2, inventory.get(equipmentId).reservedQuantity());
    }

    @Test
    void equipmentEventCarriesExactReservationAndQuantityChangesWithMaxLengthReason() {
        Long id = allocated(previousId, true), original = reservation(id);
        missions.redispatchEquipment(id, new MissionEquipmentRedispatchRequest(version(id), original, equipmentId, 1, "r".repeat(500)), auth(admin));
        var event = missions.timeline(id, auth(admin)).stream().filter(e -> e.eventType() == MissionEventType.EQUIPMENT_CHANGED).findFirst().orElseThrow();
        assertEquals(500, event.description().length());
        assertTrue(event.metadata().contains("\"previousReservationId\":" + original));
        assertTrue(event.metadata().contains("\"previousQuantity\":2"));
        assertTrue(event.metadata().contains("\"replacementQuantity\":1"));
        assertTrue(event.metadata().contains("\"replacementReservationId\":" + reservation(id)));
    }

    private long version(Long id) { return missions.dispatchResources(id, auth(admin)).version(); }
    private Long reservation(Long id) { return missions.dispatchResources(id, auth(admin)).reservations().stream().filter(r -> !r.released()).findFirst().orElseThrow().id(); }
    private MissionResourceRedispatchRequest change(Long id, Long replacement) { return new MissionResourceRedispatchRequest(version(id), replacement, "Điều phối lại"); }
    private MissionEquipmentRedispatchRequest equipmentChange(Long id, Long reservation, Long replacement, Integer quantity) {
        return new MissionEquipmentRedispatchRequest(version(id), reservation, replacement, quantity, "Điều chỉnh thiết bị");
    }

    private List<Throwable> race(Callable<?> left, Callable<?> right) throws Exception {
        var pool = Executors.newFixedThreadPool(2);
        var gate = new CountDownLatch(1);
        try {
            var futures = new ArrayList<Future<Throwable>>();
            for (Callable<?> action : List.of(left, right)) futures.add(pool.submit(() -> {
                gate.await();
                try { action.call(); return null; } catch (Throwable ex) { return ex; }
            }));
            gate.countDown();
            var results = new ArrayList<Throwable>();
            for (var future : futures) results.add(future.get(25, TimeUnit.SECONDS));
            assertTrue(results.stream().allMatch(e -> e == null || e instanceof SystemException || e instanceof IllegalStateException),
                    () -> "Unexpected concurrency failures: " + results);
            return results;
        } finally { pool.shutdownNow(); }
    }

    private Long confirmed(int days) {
        LocalDateTime start = LocalDateTime.now().plusDays(days).withNano(0);
        Long id = missions.create(new MissionCreateRequest(MissionType.AREA_INSPECTION, "Dispatch regression", null,
                start.toLocalDate(), start, start.plusHours(1), "Hanoi", null, null, null, MissionPriority.NORMAL, null), customer.getUsername()).id();
        missions.submit(id, auth(customer));
        missions.confirm(id, auth(admin));
        missions.assignStation(id, new ResourceAssignmentRequest(station.getId()), auth(admin));
        return id;
    }

    private Long allocated(Long uavId, boolean all) {
        Long id = confirmed(3);
        missions.assignUav(id, new ResourceAssignmentRequest(uavId), auth(admin));
        if (all) {
            missions.assignOperator(id, new ResourceAssignmentRequest(operator.getId()), auth(admin));
            missions.reserveEquipment(id, new ResourceAssignmentRequest(equipmentId, 2, "Fixture reservation"), auth(admin));
        }
        return id;
    }

    private List<?> snapshot(Long id) {
        return List.of(db.queryForMap("SELECT status,uav_id,station_id,operator_id,operator_accepted,operator_conflict_note,version FROM missions WHERE id=?", id),
                db.queryForMap("SELECT status FROM uavs WHERE id=?", previousId),
                db.queryForMap("SELECT status FROM uavs WHERE id=?", replacementId),
                db.queryForList("SELECT quantity,released FROM mission_equipment_reservations WHERE mission_id=? ORDER BY id", id),
                count("SELECT count(*) FROM mission_events WHERE mission_id=?", id),
                count("SELECT count(*) FROM uav_status_history WHERE uav_id IN (?," + replacementId + ")", previousId),
                count("SELECT count(*) FROM audit_logs WHERE actor_username=?", admin.getUsername()));
    }

    private MissionUavReplacementRequest replace(Long expected, Long replacement, String reason) { return new MissionUavReplacementRequest(expected, replacement, reason); }
    private int count(String sql, Object arg) { return db.queryForObject(sql, Integer.class, arg); }
    private UavStatus status(Long id) { return uavs.findById(id).orElseThrow().getStatus(); }
    private Long uav(String name, Station home) { Uav uav = new Uav("Dispatch test", "DSP-" + suffix + "-" + name, "Test"); uav.setStation(home); return uavs.save(uav).getId(); }
    private AppUser user(String name, UserRole role) { String username = name + suffix; return users.save(new AppUser(username, username + "@example.invalid", "fixture-placeholder", null, null, null, null, role, UserStatus.ACTIVE)); }
    private UsernamePasswordAuthenticationToken auth(AppUser user) { return UsernamePasswordAuthenticationToken.authenticated(user.getUsername(), "n/a", List.of()); }
}
