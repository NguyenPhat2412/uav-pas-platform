package com.uav.platform.integration.maintenance;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doThrow;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.uav.platform.dto.request.maintenance.*;
import com.uav.platform.dto.request.mission.*;
import com.uav.platform.dto.request.uav.UavRequest;
import com.uav.platform.dto.response.maintenance.*;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.maintenance.DueStatus;
import com.uav.platform.enums.maintenance.RepairStatus;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.StationStatus;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.billing.ServicePlanRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.impl.station.StationOperations;
import com.uav.platform.service.maintenance.MaintenanceService;
import com.uav.platform.service.mission.MissionService;
import com.uav.platform.service.uav.UavService;
import com.uav.platform.support.ServicePlanTestData;

import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;

/** Independent transactions exercise real locking, MVC validation/permissions and persisted rollback. */
@SpringBootTest(
        properties =
                "spring.datasource.url=jdbc:h2:mem:maintenance_planning;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
class MaintenancePlanningIntegrationTest {
    @Autowired MaintenanceService service;
    @Autowired UavService uavs;
    @Autowired ServicePlanRepository servicePlans;
    @Autowired MissionService missions;
    @Autowired StationRepository stations;
    @Autowired UserRepository users;
    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate db;
    @MockitoSpyBean AuditLogService audit;
    private Long uavId;
    private Long stationId;
    private AppUser admin;
    private AppUser customer;
    private MockMvc mvc;
    private final LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

    @BeforeEach
    void fixture() {
        ServicePlanTestData.ensureBasicPlan(servicePlans);
        String s = UUID.randomUUID().toString().substring(0, 8);
        admin = user("plan_admin_" + s, UserRole.ROLE_ADMIN);
        customer = user("plan_customer_" + s, UserRole.ROLE_PILOT);
        stationId =
                stations.save(
                                StationOperations.create(
                                        "PLAN-" + s,
                                        "Synthetic repair station",
                                        "Hanoi",
                                        null,
                                        null,
                                        StationStatus.ACTIVE))
                        .getId();
        uavId =
                uavs.create(
                                new UavRequest("Repair test", "PLAN-" + s, "Synthetic"),
                                admin.getUsername())
                        .id();
        uavs.assign(uavId, stationId, admin.getUsername());
        mvc =
                MockMvcBuilders.webAppContextSetup(context)
                        .defaultRequest(
                                org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                                        .get("/")
                                        .with(
                                                org.springframework.security.test.web.servlet
                                                        .request
                                                        .SecurityMockMvcRequestPostProcessors
                                                        .csrf()))
                        .apply(springSecurity())
                        .build();
    }

    @Test
    void linkedRepairCycleComputesCostsAndAdvancesScheduleOnlyOnce() {
        var s = schedule(today.minusDays(2));
        var o = order(s.id());
        assertEquals(UavStatus.AVAILABLE, uavs.get(uavId).status());
        o =
                service.materials(
                        o.id(),
                        new UpdateRepairMaterialsRequest(
                                o.version(),
                                List.of(material("0.333", "1000"), material("1.5", "1"))),
                        actor());
        assertEquals("335", o.totalMaterialCost());
        assertEquals(
                List.of("333", "2"),
                o.materials().stream().map(RepairMaterialResponse::lineTotal).toList());
        o = service.start(o.id(), new RepairOrderVersionRequest(o.version()), actor());
        assertEquals(UavStatus.MAINTENANCE, uavs.get(uavId).status());
        o =
                service.complete(
                        o.id(),
                        new CompleteRepairOrderRequest(
                                o.version(), "Private inspection result", true),
                        actor());
        assertEquals(RepairStatus.COMPLETED, o.status());
        assertEquals(UavStatus.AVAILABLE, uavs.get(uavId).status());
        assertEquals("335", o.totalMaterialCost());
        var after =
                service.schedules(
                                new MaintenanceScheduleQueryRequest(uavId, null),
                                PageRequest.of(0, 20))
                        .content()
                        .getFirst();
        assertEquals(today, after.lastCompletedDate());
        assertEquals(today.plusDays(30), after.nextDueDate());
        assertTrue(after.version() > s.version());
        var completed = o;
        assertCode(
                "MAINTENANCE_ORDER_INVALID_STATE",
                () ->
                        service.complete(
                                completed.id(),
                                new CompleteRepairOrderRequest(completed.version(), "Repeat", true),
                                actor()));
        assertEquals(
                after,
                service.schedules(
                                new MaintenanceScheduleQueryRequest(uavId, null),
                                PageRequest.of(0, 20))
                        .content()
                        .getFirst());
        assertEquals(
                0,
                count(
                        "SELECT count(*) FROM uav_status_history WHERE uav_id=? AND reason LIKE '%Private%'",
                        uavId));
    }

    @Test
    void emptyAndIdenticalMaterialSavesAdvanceVersionAndRejectOldEdits() {
        var o = order(null);
        long initial = o.version();
        o =
                service.materials(
                        o.id(), new UpdateRepairMaterialsRequest(o.version(), List.of()), actor());
        assertTrue(o.version() > initial);
        var current = o;
        assertCode(
                "MAINTENANCE_VERSION_CHANGED",
                () ->
                        service.materials(
                                current.id(),
                                new UpdateRepairMaterialsRequest(
                                        initial, List.of(material("1", "1"))),
                                actor()));
        o =
                service.materials(
                        o.id(),
                        new UpdateRepairMaterialsRequest(o.version(), List.of(material("1", "1"))),
                        actor());
        long previous = o.version();
        o =
                service.materials(
                        o.id(),
                        new UpdateRepairMaterialsRequest(o.version(), List.of(material("1", "1"))),
                        actor());
        assertTrue(o.version() > previous);
        assertEquals("1", o.totalMaterialCost());
        assertEquals(1, count("SELECT count(*) FROM repair_materials WHERE order_id=?", o.id()));
    }

    @Test
    void cancelledOpenOrderKeepsBusyMissionAndDoesNotAdvanceSchedule() {
        var s = schedule(today);
        Long mission = pending();
        missions.assignUav(mission, new ResourceAssignmentRequest(uavId), auth(admin));
        var o = order(s.id());
        assertEquals(UavStatus.ASSIGNED, uavs.get(uavId).status());
        assertCode(
                "UAV_HAS_ACTIVE_MISSION",
                () -> service.start(o.id(), new RepairOrderVersionRequest(o.version()), actor()));
        service.cancel(
                o.id(),
                new CancelRepairOrderRequest(o.version(), "Reschedule after mission"),
                actor());
        assertEquals(UavStatus.ASSIGNED, uavs.get(uavId).status());
        assertEquals(uavId, missions.get(mission, auth(admin)).uavId());
        assertEquals(
                s,
                service.schedules(
                                new MaintenanceScheduleQueryRequest(uavId, null),
                                PageRequest.of(0, 20))
                        .content()
                        .getFirst());
    }

    @Test
    void cancelledInProgressOrderRetainsMaintenanceAndCosts() {
        var s = schedule(today);
        var o = order(s.id());
        o =
                service.materials(
                        o.id(),
                        new UpdateRepairMaterialsRequest(
                                o.version(), List.of(material("2", "150000"))),
                        actor());
        o = service.start(o.id(), new RepairOrderVersionRequest(o.version()), actor());
        o =
                service.cancel(
                        o.id(),
                        new CancelRepairOrderRequest(o.version(), "Await replacement unit"),
                        actor());
        assertEquals(RepairStatus.CANCELLED, o.status());
        assertEquals("300000", o.totalMaterialCost());
        assertEquals(UavStatus.MAINTENANCE, uavs.get(uavId).status());
        assertEquals(
                s,
                service.schedules(
                                new MaintenanceScheduleQueryRequest(uavId, null),
                                PageRequest.of(0, 20))
                        .content()
                        .getFirst());
        var followup = order(s.id());
        assertEquals(
                RepairStatus.IN_PROGRESS,
                service.start(
                                followup.id(),
                                new RepairOrderVersionRequest(followup.version()),
                                actor())
                        .status());
    }

    @Test
    void activeRepairBlocksEveryLegacyStatusAndStationBypass() {
        var o = order(null);
        service.start(o.id(), new RepairOrderVersionRequest(o.version()), actor());
        assertCode(
                "UAV_HAS_IN_PROGRESS_REPAIR_ORDER",
                () ->
                        uavs.changeStatus(
                                uavId,
                                UavStatus.AVAILABLE,
                                "Attempt bypass",
                                UavStatus.MAINTENANCE,
                                actor()));
        assertCode(
                "UAV_HAS_IN_PROGRESS_REPAIR_ORDER",
                () -> uavs.changeStatus(uavId, UavStatus.INACTIVE, "Attempt bypass", actor()));
        assertCode("UAV_HAS_IN_PROGRESS_REPAIR_ORDER", () -> uavs.maintenance(uavId, actor()));
        assertCode(
                "UAV_HAS_IN_PROGRESS_REPAIR_ORDER", () -> uavs.assign(uavId, stationId, actor()));
        db.update("UPDATE uavs SET status='AVAILABLE' WHERE id=?", uavId);
        assertCode(
                "UAV_HAS_IN_PROGRESS_REPAIR_ORDER",
                () ->
                        uavs.changeMissionStatus(
                                uavId, UavStatus.ASSIGNED, "Bypass corrupt state", actor()));
    }

    @Test
    void openOrderDoesNotReserveUavOrPreventDispatch() {
        var o = order(null);
        Long mission = pending();
        assertEquals(
                uavId,
                missions.assignUav(mission, new ResourceAssignmentRequest(uavId), auth(admin))
                        .uavId());
        assertCode(
                "UAV_HAS_ACTIVE_MISSION",
                () -> service.start(o.id(), new RepairOrderVersionRequest(o.version()), actor()));
        assertEquals(RepairStatus.OPEN, service.order(o.id()).status());
    }

    @Test
    void existingMaintenanceCanBeAdoptedAndInactiveUavCanBeRepaired() {
        uavs.changeStatus(uavId, UavStatus.INACTIVE, "Withdraw", actor());
        var o = order(null);
        o = service.start(o.id(), new RepairOrderVersionRequest(o.version()), actor());
        service.cancel(
                o.id(),
                new CancelRepairOrderRequest(o.version(), "New work order needed"),
                actor());
        o = order(null);
        o = service.start(o.id(), new RepairOrderVersionRequest(o.version()), actor());
        assertEquals(UavStatus.MAINTENANCE, uavs.get(uavId).status());
        service.complete(
                o.id(),
                new CompleteRepairOrderRequest(o.version(), "Passed human inspection", true),
                actor());
        assertEquals(UavStatus.AVAILABLE, uavs.get(uavId).status());
    }

    @Test
    void activeMissionReferenceBlocksStartEvenIfUavStatusIsCorrupt() {
        Long mission = pending();
        missions.assignUav(mission, new ResourceAssignmentRequest(uavId), auth(admin));
        db.update("UPDATE uavs SET status='AVAILABLE' WHERE id=?", uavId);
        var o = order(null);
        assertCode(
                "UAV_HAS_ACTIVE_MISSION",
                () -> service.start(o.id(), new RepairOrderVersionRequest(o.version()), actor()));
        assertEquals(RepairStatus.OPEN, service.order(o.id()).status());
    }

    @Test
    void staleScheduleUpdateAndActiveLinkedOrderCannotOverwritePlan() {
        var s = schedule(today);
        var o = order(s.id());
        assertCode(
                "MAINTENANCE_SCHEDULE_HAS_ACTIVE_ORDER",
                () ->
                        service.updateSchedule(
                                s.id(),
                                new UpdateMaintenanceScheduleRequest(
                                        s.version(), "Changed", 60, today, false),
                                actor()));
        service.cancel(
                o.id(),
                new CancelRepairOrderRequest(o.version(), "CancelRepairOrderRequest"),
                actor());
        var next =
                service.updateSchedule(
                        s.id(),
                        new UpdateMaintenanceScheduleRequest(
                                s.version(), "Changed", 60, today.plusDays(1), false),
                        actor());
        assertEquals(DueStatus.PAUSED, next.dueStatus());
        assertTrue(next.version() > s.version());
        assertCode(
                "MAINTENANCE_VERSION_CHANGED",
                () ->
                        service.updateSchedule(
                                s.id(),
                                new UpdateMaintenanceScheduleRequest(
                                        s.version(), "Stale", 1, today, true),
                                actor()));
        assertCode("MAINTENANCE_SCHEDULE_PAUSED", () -> order(s.id()));
    }

    @Test
    void linkedScheduleMustBelongToOrderUav() {
        var s = schedule(today);
        Long other =
                uavs.create(
                                new UavRequest("Other", "OTHER-" + UUID.randomUUID(), "Synthetic"),
                                actor())
                        .id();
        assertCode(
                "MAINTENANCE_SCHEDULE_UAV_MISMATCH",
                () ->
                        service.createOrder(
                                new CreateRepairOrderRequest(
                                        other, s.id(), "Wrong UAV", "", today, "Technician"),
                                actor()));
        assertEquals(
                0,
                service.orders(new RepairOrderQueryRequest(other, null), PageRequest.of(0, 20))
                        .totalElements());
    }

    @Test
    void dueFilteringUsesBusinessDateAndPauseOverridesDue() {
        var overdue = schedule(today.minusDays(1));
        var due = schedule(today);
        var upcoming = schedule(today.plusDays(1));
        assertEquals(
                List.of(overdue.id()),
                service
                        .schedules(
                                new MaintenanceScheduleQueryRequest(uavId, DueStatus.OVERDUE),
                                PageRequest.of(0, 20))
                        .content()
                        .stream()
                        .map(MaintenanceScheduleResponse::id)
                        .toList());
        assertEquals(
                List.of(due.id()),
                service
                        .schedules(
                                new MaintenanceScheduleQueryRequest(uavId, DueStatus.DUE),
                                PageRequest.of(0, 20))
                        .content()
                        .stream()
                        .map(MaintenanceScheduleResponse::id)
                        .toList());
        assertEquals(
                List.of(upcoming.id()),
                service
                        .schedules(
                                new MaintenanceScheduleQueryRequest(uavId, DueStatus.UPCOMING),
                                PageRequest.of(0, 20))
                        .content()
                        .stream()
                        .map(MaintenanceScheduleResponse::id)
                        .toList());
        service.updateSchedule(
                overdue.id(),
                new UpdateMaintenanceScheduleRequest(
                        overdue.version(), overdue.title(), 30, overdue.nextDueDate(), false),
                actor());
        assertEquals(
                0,
                service.schedules(
                                new MaintenanceScheduleQueryRequest(uavId, DueStatus.OVERDUE),
                                PageRequest.of(0, 20))
                        .totalElements());
        assertEquals(
                1,
                service.schedules(
                                new MaintenanceScheduleQueryRequest(uavId, DueStatus.PAUSED),
                                PageRequest.of(0, 20))
                        .totalElements());
    }

    @Test
    void completedOrderIsImmutableForAllMutations() {
        var o = order(null);
        o = service.start(o.id(), new RepairOrderVersionRequest(o.version()), actor());
        service.complete(
                o.id(),
                new CompleteRepairOrderRequest(o.version(), "Inspection passed", true),
                actor());
        // Compare persisted snapshots: timestamp columns may round the JVM's nanoseconds.
        var done = service.order(o.id());
        assertEquals(RepairStatus.COMPLETED, done.status());
        assertCode(
                "MAINTENANCE_ORDER_TERMINAL",
                () ->
                        service.materials(
                                done.id(),
                                new UpdateRepairMaterialsRequest(done.version(), List.of()),
                                actor()));
        assertCode(
                "MAINTENANCE_ORDER_TERMINAL",
                () ->
                        service.updateOrder(
                                done.id(),
                                new UpdateRepairOrderRequest(
                                        done.version(), "Changed", "", today, "Other"),
                                actor()));
        assertCode(
                "MAINTENANCE_ORDER_TERMINAL",
                () ->
                        service.cancel(
                                done.id(),
                                new CancelRepairOrderRequest(
                                        done.version(), "CancelRepairOrderRequest"),
                                actor()));
        assertCode(
                "MAINTENANCE_ORDER_INVALID_STATE",
                () ->
                        service.start(
                                done.id(), new RepairOrderVersionRequest(done.version()), actor()));
        assertEquals(done, service.order(done.id()));
    }

    @Test
    void auditFailureRollsBackCompletionUavHistoryAndSchedule() {
        var s = schedule(today);
        var o = order(s.id());
        o = service.start(o.id(), new RepairOrderVersionRequest(o.version()), actor());
        var started = service.order(o.id());
        int histories = count("SELECT count(*) FROM uav_status_history WHERE uav_id=?", uavId);
        assertEquals(RepairStatus.IN_PROGRESS, started.status());
        doThrow(new IllegalStateException("Synthetic audit write failure"))
                .when(audit)
                .record(
                        isNull(),
                        eq(actor()),
                        eq(AuditAction.UPDATE),
                        eq("REPAIR_ORDER"),
                        eq(o.id().toString()),
                        eq("COMPLETED"));
        assertThrows(
                IllegalStateException.class,
                () ->
                        service.complete(
                                started.id(),
                                new CompleteRepairOrderRequest(started.version(), "Passed", true),
                                actor()));
        assertEquals(started, service.order(o.id()));
        assertEquals(UavStatus.MAINTENANCE, uavs.get(uavId).status());
        assertEquals(
                histories, count("SELECT count(*) FROM uav_status_history WHERE uav_id=?", uavId));
        assertEquals(
                s,
                service.schedules(
                                new MaintenanceScheduleQueryRequest(uavId, null),
                                PageRequest.of(0, 20))
                        .content()
                        .getFirst());
    }

    @Test
    void auditFailureRollsBackMaterialReplacementAndVersion() {
        var o = order(null);
        o =
                service.materials(
                        o.id(),
                        new UpdateRepairMaterialsRequest(
                                o.version(), List.of(material("1", "100"))),
                        actor());
        var before = o;
        doThrow(new IllegalStateException("Synthetic audit write failure"))
                .when(audit)
                .record(
                        isNull(),
                        eq(actor()),
                        eq(AuditAction.UPDATE),
                        eq("REPAIR_ORDER"),
                        eq(o.id().toString()),
                        startsWith("MATERIALS_UPDATED"));
        assertThrows(
                IllegalStateException.class,
                () ->
                        service.materials(
                                before.id(),
                                new UpdateRepairMaterialsRequest(
                                        before.version(), List.of(material("2", "200"))),
                                actor()));
        assertEquals(before, service.order(o.id()));
    }

    @Test
    void concurrentCreatesYieldOneActiveOrder() throws Exception {
        assertEquals(1, race(() -> order(null), () -> order(null)));
        assertEquals(
                1,
                service.orders(
                                new RepairOrderQueryRequest(uavId, RepairStatus.OPEN),
                                PageRequest.of(0, 20))
                        .totalElements());
        assertEquals(UavStatus.AVAILABLE, uavs.get(uavId).status());
    }

    @Test
    void concurrentSameVersionMaterialEditsCannotLoseAnUpdate() throws Exception {
        var o = order(null);
        assertEquals(
                1,
                race(
                        () ->
                                service.materials(
                                        o.id(),
                                        new UpdateRepairMaterialsRequest(
                                                o.version(), List.of(material("1", "100"))),
                                        actor()),
                        () ->
                                service.materials(
                                        o.id(),
                                        new UpdateRepairMaterialsRequest(
                                                o.version(), List.of(material("1", "200"))),
                                        actor())));
        assertTrue(Set.of("100", "200").contains(service.order(o.id()).totalMaterialCost()));
        assertEquals(o.version() + 1, service.order(o.id()).version());
    }

    @Test
    void concurrentCompleteAndCancelPreserveOneConsistentOutcome() throws Exception {
        var s = schedule(today);
        var o = order(s.id());
        var started = service.start(o.id(), new RepairOrderVersionRequest(o.version()), actor());
        assertEquals(
                1,
                race(
                        () ->
                                service.complete(
                                        o.id(),
                                        new CompleteRepairOrderRequest(
                                                started.version(), "Passed", true),
                                        actor()),
                        () ->
                                service.cancel(
                                        o.id(),
                                        new CancelRepairOrderRequest(
                                                started.version(), "Cancelled"),
                                        actor())));
        var finalOrder = service.order(o.id());
        var finalSchedule =
                service.schedules(
                                new MaintenanceScheduleQueryRequest(uavId, null),
                                PageRequest.of(0, 20))
                        .content()
                        .getFirst();
        if (finalOrder.status() == RepairStatus.COMPLETED) {
            assertEquals(UavStatus.AVAILABLE, uavs.get(uavId).status());
            assertEquals(today.plusDays(30), finalSchedule.nextDueDate());
        } else {
            assertEquals(RepairStatus.CANCELLED, finalOrder.status());
            assertEquals(UavStatus.MAINTENANCE, uavs.get(uavId).status());
            assertEquals(s, finalSchedule);
        }
    }

    @Test
    void concurrentStartAndMissionAssignmentCannotDoubleBookUav() throws Exception {
        var o = order(null);
        Long mission = pending();
        assertEquals(
                1,
                race(
                        () ->
                                service.start(
                                        o.id(),
                                        new RepairOrderVersionRequest(o.version()),
                                        actor()),
                        () ->
                                missions.assignUav(
                                        mission,
                                        new ResourceAssignmentRequest(uavId),
                                        auth(admin))));
        if (service.order(o.id()).status() == RepairStatus.IN_PROGRESS) {
            assertEquals(UavStatus.MAINTENANCE, uavs.get(uavId).status());
            assertNull(missions.get(mission, auth(admin)).uavId());
        } else {
            assertEquals(UavStatus.ASSIGNED, uavs.get(uavId).status());
            assertEquals(uavId, missions.get(mission, auth(admin)).uavId());
        }
    }

    @Test
    void moneyAtMaximumBoundaryIsExactAndNeverDeductsInventory() {
        db.update(
                "INSERT INTO equipment(name,type,status,station_id,quantity,available_quantity,reserved_quantity,version) VALUES ('Synthetic cost isolation','BATTERY','ACTIVE',?,7,5,2,0)",
                stationId);
        var o = order(null);
        var before =
                db.queryForList(
                        "SELECT * FROM equipment WHERE station_id=? ORDER BY id", stationId);
        var materials = new ArrayList<RepairMaterialRequest>();
        for (int i = 0; i < 100; i++) materials.add(material("10000", "1000000000"));
        o =
                service.materials(
                        o.id(), new UpdateRepairMaterialsRequest(o.version(), materials), actor());
        assertEquals("1000000000000000", o.totalMaterialCost());
        assertEquals(
                before,
                db.queryForList(
                        "SELECT * FROM equipment WHERE station_id=? ORDER BY id", stationId));
    }

    @Test
    void customerReadPermissionDoesNotExposeRepairPricesOrAllowWrites() throws Exception {
        var s = schedule(today);
        var o = order(s.id());
        for (String path : List.of("/schedules", "/orders", "/orders/" + o.id())) {
            mvc.perform(get("/api/v1/maintenance" + path).with(authentication(auth(customer))))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(
                        post("/api/v1/maintenance/orders/" + o.id() + "/start")
                                .with(authentication(auth(customer)))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"expectedVersion\":0}"))
                .andExpect(status().isForbidden());
        assertEquals(RepairStatus.OPEN, service.order(o.id()).status());
    }

    @Test
    void mvcReturnsStringMoneyAndRejectsUnconfirmedInspection() throws Exception {
        var o = order(null);
        mvc.perform(
                        put("/api/v1/maintenance/orders/" + o.id() + "/materials")
                                .with(authentication(auth(admin)))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"expectedVersion\":0,\"items\":[{\"name\":\"Rotor\",\"unit\":\"set\",\"quantity\":\"1.5\",\"unitPrice\":\"1\"}],\"totalMaterialCost\":999}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMaterialCost").value("2"))
                .andExpect(jsonPath("$.materials[0].lineTotal").value("2"));
        var updated = service.order(o.id());
        var started =
                service.start(o.id(), new RepairOrderVersionRequest(updated.version()), actor());
        mvc.perform(
                        post("/api/v1/maintenance/orders/" + o.id() + "/complete")
                                .with(authentication(auth(admin)))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"expectedVersion\":"
                                                + started.version()
                                                + ",\"inspectionNotes\":\"Passed\",\"inspectionPassed\":false}"))
                .andExpect(status().isBadRequest());
        assertEquals(RepairStatus.IN_PROGRESS, service.order(o.id()).status());
    }

    @ParameterizedTest
    @ValueSource(strings = {"0,1", "-1,1", "10001,1", "1.0001,1", "1,-1", "1,1.5", "1,1000000001"})
    void invalidMaterialNumbersReturn400WithoutMutation(String numbers) throws Exception {
        var n = numbers.split(",");
        var o = order(null);
        var before = service.order(o.id());
        mvc.perform(
                        put("/api/v1/maintenance/orders/" + o.id() + "/materials")
                                .with(authentication(auth(admin)))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"expectedVersion\":0,\"items\":[{\"name\":\"Rotor\",\"unit\":\"set\",\"quantity\":"
                                                + n[0]
                                                + ",\"unitPrice\":"
                                                + n[1]
                                                + "}]}"))
                .andExpect(status().isBadRequest());
        assertEquals(before, service.order(o.id()));
    }

    @Test
    void missingExpectedVersionAndMissingNotesReturn400() throws Exception {
        var o = order(null);
        var before = service.order(o.id());
        mvc.perform(
                        post("/api/v1/maintenance/orders/" + o.id() + "/start")
                                .with(authentication(auth(admin)))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(
                        post("/api/v1/maintenance/orders/" + o.id() + "/cancel")
                                .with(authentication(auth(admin)))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"expectedVersion\":0,\"reason\":\" \"}"))
                .andExpect(status().isBadRequest());
        assertEquals(before, service.order(o.id()));
    }

    private MaintenanceScheduleResponse schedule(LocalDate date) {
        return service.createSchedule(
                new CreateMaintenanceScheduleRequest(uavId, "Periodic inspection", 30, date),
                actor());
    }

    private RepairOrderResponse order(Long schedule) {
        return service.createOrder(
                new CreateRepairOrderRequest(
                        uavId,
                        schedule,
                        "Rotor inspection",
                        "Synthetic diagnosis",
                        today,
                        "Synthetic technician"),
                actor());
    }

    private RepairMaterialRequest material(String quantity, String price) {
        return new RepairMaterialRequest(
                "Rotor", "set", new BigDecimal(quantity), new BigDecimal(price));
    }

    private String actor() {
        return admin.getUsername();
    }

    private void assertCode(String code, org.junit.jupiter.api.function.Executable action) {
        assertEquals(code, assertThrows(SystemException.class, action).getCode());
    }

    private int count(String sql, Object id) {
        return db.queryForObject(sql, Integer.class, id);
    }

    private AppUser user(String name, UserRole role) {
        return users.save(
                new AppUser(
                        name,
                        name + "@example.invalid",
                        "synthetic-placeholder",
                        null,
                        null,
                        null,
                        null,
                        role,
                        UserStatus.ACTIVE));
    }

    private UsernamePasswordAuthenticationToken auth(AppUser u) {
        return UsernamePasswordAuthenticationToken.authenticated(u.getUsername(), "n/a", List.of());
    }

    private Long pending() {
        LocalDateTime start = LocalDateTime.now().plusDays(3).withNano(0);
        Long id =
                missions.create(
                                new MissionCreateRequest(
                                        MissionType.AREA_INSPECTION,
                                        "Repair integration",
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
        missions.assignStation(id, new ResourceAssignmentRequest(stationId), auth(admin));
        return id;
    }

    private int race(Callable<?> first, Callable<?> second) throws Exception {
        var gate = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var results = new ArrayList<Future<Integer>>();
            for (var action : List.of(first, second))
                results.add(
                        pool.submit(
                                () -> {
                                    gate.await();
                                    try {
                                        action.call();
                                        return 1;
                                    } catch (SystemException ex) {
                                        assertEquals(409, ex.getStatus().value());
                                        return 0;
                                    }
                                }));
            gate.countDown();
            return results.get(0).get(20, TimeUnit.SECONDS)
                    + results.get(1).get(20, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }
    }
}
