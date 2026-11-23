package com.uav.platform.stabilization;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.dao.inventory.IEquipmentDao;
import com.uav.platform.dao.marketplace.IProviderProfileDao;
import com.uav.platform.dao.mission.IMissionDao;
import com.uav.platform.dao.uav.IUavDao;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.request.inventory.EquipmentRequest;
import com.uav.platform.dto.request.inventory.QuantityRequest;
import com.uav.platform.dto.request.marketplace.admin.ProviderModerationRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOnboardingRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOrderActionRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOrderAssignRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderPilotUpsertRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderUavCreateRequest;
import com.uav.platform.dto.response.inventory.EquipmentResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderPilotResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderProfileResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderUavResponse;
import com.uav.platform.entity.marketplace.ProviderProfile;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.inventory.EquipmentType;
import com.uav.platform.enums.marketplace.ProviderOrderStatus;
import com.uav.platform.enums.marketplace.ProviderPilotStatus;
import com.uav.platform.enums.marketplace.ProviderType;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;
import com.uav.platform.enums.mission.MissionPriority;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.service.inventory.InventoryService;
import com.uav.platform.service.marketplace.admin.MarketplaceAdminService;
import com.uav.platform.service.marketplace.provider.MarketplaceProviderFleetService;
import com.uav.platform.service.marketplace.provider.MarketplaceProviderService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/**
 * Real PostgreSQL concurrency & double-booking verification for marketplace order assignment,
 * flight start, and equipment inventory reservation. Uses real SELECT ... FOR UPDATE row locks in
 * an isolated Flyway schema.
 */
@SpringBootTest
@EnabledIfEnvironmentVariable(
        named = "UAV_STABILIZATION_DB_URL",
        matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/uav_(stabilization|ba_test_suite)")
class MarketplaceConcurrencyPostgresTest {

    private static final String SCHEMA = "mp_conc_" + UUID.randomUUID().toString().replace("-", "");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url", () -> System.getenv("UAV_STABILIZATION_DB_URL"));
        p.add("spring.datasource.username", () -> System.getenv("UAV_STABILIZATION_DB_USER"));
        p.add("spring.datasource.password", () -> System.getenv("UAV_STABILIZATION_DB_PASSWORD"));
        p.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        p.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        p.add("spring.flyway.enabled", () -> true);
        p.add("spring.flyway.schemas", () -> SCHEMA);
        p.add("spring.flyway.default-schema", () -> SCHEMA);
        p.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        p.add("spring.datasource.hikari.connection-init-sql", () -> "SET search_path TO " + SCHEMA);
        p.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        p.add("app.phase1.compatibility-schema.enabled", () -> false);
        p.add("app.billing.invoice-worker-enabled", () -> false);
    }

    @Autowired JdbcTemplate db;
    @Autowired IUserDao users;
    @Autowired IProviderProfileDao providers;
    @Autowired IUavDao uavs;
    @Autowired IMissionDao missions;
    @Autowired IEquipmentDao equipmentRepository;
    @Autowired InventoryService inventoryService;
    @Autowired MarketplaceProviderService providerService;
    @Autowired MarketplaceProviderFleetService fleetService;
    @Autowired MarketplaceAdminService adminService;

    private AppUser admin;
    private AppUser customer;
    private AppUser fleetOwner;
    private AppUser otherFleetOwner;
    private ProviderProfile fleetProfile;
    private ProviderUavResponse uav1;
    private ProviderUavResponse uav2;
    private ProviderPilotResponse pilot1;
    private ProviderPilotResponse pilot2;

    @BeforeEach
    void setupFixture() {
        db.execute(
                "TRUNCATE users,uav_stations,equipment,media_assets,inventory_movements,audit_logs CASCADE");
        admin = saveUser("adm", UserRole.ROLE_ADMIN);
        customer = saveUser("cus", UserRole.ROLE_PILOT);
        fleetOwner = saveUser("fl1", UserRole.ROLE_PILOT);
        otherFleetOwner = saveUser("fl2", UserRole.ROLE_PILOT);

        ProviderProfileResponse p1 = onboardAndVerify(fleetOwner, "Đội bay PostgreSQL A");
        onboardAndVerify(otherFleetOwner, "Đội bay PostgreSQL B");
        fleetProfile = providers.findById(p1.id()).orElseThrow();

        uav1 =
                providerService.registerProviderUav(
                        new ProviderUavCreateRequest("PG-UAV-01", "Matrice 350", "DJI"),
                        fleetOwner.getUsername());
        uav2 =
                providerService.registerProviderUav(
                        new ProviderUavCreateRequest("PG-UAV-02", "Mavic 3E", "DJI"),
                        fleetOwner.getUsername());

        AppUser pilotUser1 = saveUser("pl1", UserRole.ROLE_OPERATOR);
        AppUser pilotUser2 = saveUser("pl2", UserRole.ROLE_OPERATOR);
        pilot1 =
                fleetService.createPilot(
                        new ProviderPilotUpsertRequest(
                                pilotUser1.getId(),
                                null,
                                "Kỹ sư PG 1",
                                pilotUser1.getEmail(),
                                "0901000001",
                                "LIC-PG-01",
                                "Khảo sát",
                                ProviderPilotStatus.AVAILABLE,
                                uav1.id()),
                        fleetOwner.getUsername());
        pilot2 =
                fleetService.createPilot(
                        new ProviderPilotUpsertRequest(
                                pilotUser2.getId(),
                                null,
                                "Kỹ sư PG 2",
                                pilotUser2.getEmail(),
                                "0901000002",
                                "LIC-PG-02",
                                "Nhiệt",
                                ProviderPilotStatus.AVAILABLE,
                                uav2.id()),
                        fleetOwner.getUsername());
    }

    @Test
    void sequentialOverlappingUavAssignmentReturns409UavTimeConflict() {
        Mission orderA = createProviderOrder(9, 11, MissionStatus.CONFIRMED);
        Mission orderB = createProviderOrder(10, 12, MissionStatus.CONFIRMED);

        fleetService.assignOrder(
                orderA.getId(),
                new ProviderOrderAssignRequest(pilot1.id(), null, uav1.id(), "Đơn A"),
                fleetOwner.getUsername());

        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () ->
                                fleetService.assignOrder(
                                        orderB.getId(),
                                        new ProviderOrderAssignRequest(
                                                pilot2.id(), null, uav1.id(), "Đơn B"),
                                        fleetOwner.getUsername()));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("UAV_TIME_CONFLICT", ex.getCode());
    }

    @Test
    void backToBackAdjacentSlotsSameUavAndPilotAreAllowed() {
        Mission orderA = createProviderOrder(9, 10, MissionStatus.CONFIRMED);
        Mission orderB = createProviderOrder(10, 11, MissionStatus.CONFIRMED);

        var resA =
                fleetService.assignOrder(
                        orderA.getId(),
                        new ProviderOrderAssignRequest(pilot1.id(), null, uav1.id(), "9-10"),
                        fleetOwner.getUsername());
        var resB =
                fleetService.assignOrder(
                        orderB.getId(),
                        new ProviderOrderAssignRequest(pilot1.id(), null, uav1.id(), "10-11"),
                        fleetOwner.getUsername());

        assertEquals(MissionStatus.READY, resA.status());
        assertEquals(MissionStatus.READY, resB.status());
    }

    @Test
    void cancelledAndCompletedOrdersDoNotBlockSameUavSlot() {
        Mission cancelledOrder = createProviderOrder(9, 11, MissionStatus.CONFIRMED);
        fleetService.assignOrder(
                cancelledOrder.getId(),
                new ProviderOrderAssignRequest(pilot1.id(), null, uav1.id(), null),
                fleetOwner.getUsername());
        cancelledOrder = missions.findById(cancelledOrder.getId()).orElseThrow();
        cancelledOrder.setStatus(MissionStatus.CANCELLED);
        missions.save(cancelledOrder);

        Mission completedOrder = createProviderOrder(9, 11, MissionStatus.CONFIRMED);
        fleetService.assignOrder(
                completedOrder.getId(),
                new ProviderOrderAssignRequest(pilot1.id(), null, uav1.id(), null),
                fleetOwner.getUsername());
        completedOrder = missions.findById(completedOrder.getId()).orElseThrow();
        completedOrder.setStatus(MissionStatus.COMPLETED);
        missions.save(completedOrder);

        Mission orderB = createProviderOrder(10, 12, MissionStatus.CONFIRMED);
        var assigned =
                fleetService.assignOrder(
                        orderB.getId(),
                        new ProviderOrderAssignRequest(pilot1.id(), null, uav1.id(), "Hợp lệ"),
                        fleetOwner.getUsername());
        assertEquals(MissionStatus.READY, assigned.status());
    }

    @Test
    void overlappingOperatorDifferentUavReturns409OperatorTimeConflict() {
        Mission orderA = createProviderOrder(9, 11, MissionStatus.CONFIRMED);
        Mission orderB = createProviderOrder(10, 12, MissionStatus.CONFIRMED);

        fleetService.assignOrder(
                orderA.getId(),
                new ProviderOrderAssignRequest(pilot1.id(), null, uav1.id(), null),
                fleetOwner.getUsername());

        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () ->
                                fleetService.assignOrder(
                                        orderB.getId(),
                                        new ProviderOrderAssignRequest(
                                                pilot1.id(), null, uav2.id(), null),
                                        fleetOwner.getUsername()));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("OPERATOR_TIME_CONFLICT", ex.getCode());
    }

    @Test
    void startOrderRejects409UavInUseWhenAnotherMissionWithSameUavIsInProgress() {
        // Two non-overlapping orders sharing the same UAV (e.g. legacy or back-to-back),
        // starting the second while the first is still IN_PROGRESS must fail with 409 UAV_IN_USE.
        Mission orderA = createProviderOrder(9, 10, MissionStatus.CONFIRMED);
        Mission orderB = createProviderOrder(10, 11, MissionStatus.CONFIRMED);

        fleetService.assignOrder(
                orderA.getId(),
                new ProviderOrderAssignRequest(pilot1.id(), null, uav1.id(), null),
                fleetOwner.getUsername());
        fleetService.assignOrder(
                orderB.getId(),
                new ProviderOrderAssignRequest(pilot2.id(), null, uav1.id(), null),
                fleetOwner.getUsername());

        providerService.startOrder(orderA.getId(), fleetOwner.getUsername());

        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () -> providerService.startOrder(orderB.getId(), fleetOwner.getUsername()));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("UAV_IN_USE", ex.getCode());
    }

    @Test
    void concurrentAssignSameUavToOverlappingOrdersAllowsExactlyOneAndLeavesSingleUavHolderInDb()
            throws Exception {
        Mission orderA = createProviderOrder(9, 11, MissionStatus.CONFIRMED);
        Mission orderB = createProviderOrder(10, 12, MissionStatus.CONFIRMED);

        List<Outcome> outcomes =
                raceTwo(
                        () ->
                                fleetService.assignOrder(
                                        orderA.getId(),
                                        new ProviderOrderAssignRequest(
                                                pilot1.id(), null, uav1.id(), "Thread-A"),
                                        fleetOwner.getUsername()),
                        () ->
                                fleetService.assignOrder(
                                        orderB.getId(),
                                        new ProviderOrderAssignRequest(
                                                pilot2.id(), null, uav1.id(), "Thread-B"),
                                        fleetOwner.getUsername()));

        long successes = outcomes.stream().filter(o -> o.error == null).count();
        long conflicts =
                outcomes.stream()
                        .filter(
                                o ->
                                        o.error instanceof SystemException se
                                                && se.getStatus() == HttpStatus.CONFLICT
                                                && "UAV_TIME_CONFLICT".equals(se.getCode()))
                        .count();

        assertEquals(1, successes, "Exactly one thread must win the UAV row lock");
        assertEquals(1, conflicts, "Exactly one thread must fail with 409 UAV_TIME_CONFLICT");

        Integer holders =
                db.queryForObject(
                        "SELECT count(*) FROM missions WHERE uav_id = ? AND status NOT IN ('CANCELLED','COMPLETED','FAILED','REJECTED')",
                        Integer.class,
                        uav1.id());
        assertEquals(1, holders, "Database must have exactly one active mission holding the UAV");
    }

    @Test
    void concurrentInventoryReserveOfLastUnitAllowsExactlyOneAndNeverGoesNegative()
            throws Exception {
        EquipmentResponse item =
                inventoryService.create(
                        new EquipmentRequest(
                                "Pin TB65 cuối cùng", EquipmentType.BATTERY, null, null),
                        "pg_admin");
        inventoryService.stockIn(
                item.id(),
                new QuantityRequest(1, "Nhập 1 bộ pin", "stock-" + UUID.randomUUID()),
                "pg_admin");

        List<Outcome> outcomes =
                raceTwo(
                        () ->
                                inventoryService.reserve(
                                        item.id(),
                                        new QuantityRequest(
                                                1, "Đơn 1", "res-a-" + UUID.randomUUID()),
                                        "pg_admin"),
                        () ->
                                inventoryService.reserve(
                                        item.id(),
                                        new QuantityRequest(
                                                1, "Đơn 2", "res-b-" + UUID.randomUUID()),
                                        "pg_admin"));

        long successes = outcomes.stream().filter(o -> o.error == null).count();
        long rejections =
                outcomes.stream()
                        .filter(
                                o ->
                                        o.error instanceof IllegalStateException
                                                || (o.error instanceof SystemException se
                                                        && se.getStatus() == HttpStatus.CONFLICT))
                        .count();

        assertEquals(1, successes, "Exactly one reserve thread must succeed for quantity=1");
        assertEquals(
                1,
                rejections,
                "Exactly one reserve thread must be rejected for insufficient available equipment");

        var saved = equipmentRepository.findById(item.id()).orElseThrow();
        assertEquals(0, saved.getAvailableQuantity());
        assertEquals(1, saved.getReservedQuantity());
        assertTrue(saved.getAvailableQuantity() >= 0);
    }

    @Test
    void customerAndOtherFleetOwnerStillReceive403OnAssign() {
        Mission orderA = createProviderOrder(9, 11, MissionStatus.CONFIRMED);

        SystemException otherFleetEx =
                assertThrows(
                        SystemException.class,
                        () ->
                                fleetService.assignOrder(
                                        orderA.getId(),
                                        new ProviderOrderAssignRequest(null, null, uav1.id(), null),
                                        otherFleetOwner.getUsername()));
        assertEquals(HttpStatus.FORBIDDEN, otherFleetEx.getStatus());
        assertEquals("ORDER_ACCESS_DENIED", otherFleetEx.getCode());

        // Customer has no ProviderProfile -> 403 Forbidden
        SystemException customerEx =
                assertThrows(
                        SystemException.class,
                        () ->
                                fleetService.assignOrder(
                                        orderA.getId(),
                                        new ProviderOrderAssignRequest(null, null, uav1.id(), null),
                                        customer.getUsername()));
        assertEquals(HttpStatus.FORBIDDEN, customerEx.getStatus());
        assertEquals("PROVIDER_PROFILE_REQUIRED", customerEx.getCode());
    }

    @Test
    void startOrderWithoutUavRejects409NoUavAvailableWhenOnlyFleetUavIsBookedInOverlappingSlot() {
        // Fleet has only uav1 available (mark uav2 MAINTENANCE so uav1 is the sole candidate).
        var u2 = uavs.findById(uav2.id()).orElseThrow();
        u2.setStatus(UavStatus.MAINTENANCE);
        uavs.save(u2);

        Mission orderA = createProviderOrder(9, 11, MissionStatus.CONFIRMED);
        Mission orderB = createProviderOrder(10, 12, MissionStatus.CONFIRMED);

        fleetService.assignOrder(
                orderA.getId(),
                new ProviderOrderAssignRequest(pilot1.id(), null, uav1.id(), "Hứa giao X cho A"),
                fleetOwner.getUsername());

        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () -> providerService.startOrder(orderB.getId(), fleetOwner.getUsername()));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        assertEquals("NO_UAV_AVAILABLE", ex.getCode());

        Mission persistedA = missions.findById(orderA.getId()).orElseThrow();
        assertNotNull(persistedA.getUav());
        assertEquals(uav1.id(), persistedA.getUav().getId());
    }

    @Test
    void startOrderWithoutUavAutoPicksFreeUavYAndLeavesOverlappingUavXForOrderA() {
        Mission orderA = createProviderOrder(9, 11, MissionStatus.CONFIRMED);
        Mission orderB = createProviderOrder(10, 12, MissionStatus.CONFIRMED);

        // Order A books uav1 (X) for 9:00-11:00; uav2 (Y) remains free.
        fleetService.assignOrder(
                orderA.getId(),
                new ProviderOrderAssignRequest(pilot1.id(), null, uav1.id(), "A giữ X"),
                fleetOwner.getUsername());

        var startedB = providerService.startOrder(orderB.getId(), fleetOwner.getUsername());
        assertEquals(MissionStatus.IN_PROGRESS, startedB.status());
        assertEquals(uav2.id(), startedB.assignedUavId());

        Mission persistedA = missions.findById(orderA.getId()).orElseThrow();
        assertNotNull(persistedA.getUav());
        assertEquals(uav1.id(), persistedA.getUav().getId());
    }

    @Test
    void respondToOverlappingOrdersWithoutSpecifiedPilotRejectsSecondWith409AndAllowsAdjacent() {
        Mission orderA = createProviderOrder(9, 11, MissionStatus.PENDING_CONFIRMATION);
        Mission orderB = createProviderOrder(10, 12, MissionStatus.PENDING_CONFIRMATION);
        Mission orderC = createProviderOrder(11, 13, MissionStatus.PENDING_CONFIRMATION);

        var acceptedA =
                providerService.respondToOrder(
                        orderA.getId(),
                        new ProviderOrderActionRequest(true, null, "Nhận đơn A"),
                        fleetOwner.getUsername());
        assertEquals(MissionStatus.CONFIRMED, acceptedA.status());

        SystemException overlapEx =
                assertThrows(
                        SystemException.class,
                        () ->
                                providerService.respondToOrder(
                                        orderB.getId(),
                                        new ProviderOrderActionRequest(true, null, "Nhận đơn B"),
                                        fleetOwner.getUsername()));
        assertEquals(HttpStatus.CONFLICT, overlapEx.getStatus());
        assertEquals("OPERATOR_TIME_CONFLICT", overlapEx.getCode());

        // Adjacent 11:00-13:00 touching edge at 11:00 must succeed.
        var acceptedC =
                providerService.respondToOrder(
                        orderC.getId(),
                        new ProviderOrderActionRequest(true, null, "Nhận đơn C chạm mép"),
                        fleetOwner.getUsername());
        assertEquals(MissionStatus.CONFIRMED, acceptedC.status());
    }

    private record Outcome(Object value, Throwable error) {}

    private List<Outcome> raceTwo(Callable<?> first, Callable<?> second) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Callable<Outcome>> tasks = new ArrayList<>();
            for (Callable<?> action : List.of(first, second)) {
                tasks.add(
                        () -> {
                            ready.countDown();
                            start.await(10, TimeUnit.SECONDS);
                            try {
                                return new Outcome(action.call(), null);
                            } catch (Throwable t) {
                                return new Outcome(null, t);
                            }
                        });
            }
            List<Future<Outcome>> futures =
                    List.of(pool.submit(tasks.get(0)), pool.submit(tasks.get(1)));
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            List<Outcome> results = new ArrayList<>();
            for (Future<Outcome> f : futures) {
                try {
                    results.add(f.get(30, TimeUnit.SECONDS));
                } catch (ExecutionException ex) {
                    results.add(new Outcome(null, ex.getCause()));
                }
            }
            return results;
        } finally {
            pool.shutdownNow();
        }
    }

    private AppUser saveUser(String prefix, UserRole role) {
        String id = UUID.randomUUID().toString().substring(0, 6);
        AppUser u =
                new AppUser(
                        prefix + "_" + id,
                        prefix + "_" + id + "@example.test",
                        "hash",
                        prefix + " " + id,
                        UserStatus.ACTIVE);
        u.setRole(role);
        return users.save(u);
    }

    private ProviderProfileResponse onboardAndVerify(AppUser owner, String name) {
        ProviderProfileResponse created =
                providerService.upsertMyProfile(
                        new ProviderOnboardingRequest(
                                name,
                                ProviderType.COMPANY,
                                "0109998888",
                                "GP-PG-01",
                                "Đội bay kiểm thử tranh chấp",
                                "TP. Hồ Chí Minh",
                                120,
                                "0909000111",
                                "Vietcombank",
                                "0071000011111",
                                "TEST FLEET",
                                true),
                        owner.getUsername());
        return adminService.moderateProvider(
                created.id(),
                new ProviderModerationRequest(
                        ProviderVerificationStatus.VERIFIED, "Duyệt tự động", null),
                admin.getUsername());
    }

    private Mission createProviderOrder(int startHour, int endHour, MissionStatus status) {
        LocalDate day = LocalDate.now().plusDays(3);
        LocalDateTime start = day.atTime(startHour, 0);
        LocalDateTime end = day.atTime(endHour, 0);
        Mission m = new Mission();
        m.setCode("MSN-PG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        m.setTitle("Đơn kiểm thử tranh chấp " + startHour + "h-" + endHour + "h");
        m.setMissionType(MissionType.AREA_INSPECTION);
        m.setPriority(MissionPriority.NORMAL);
        m.setStatus(status);
        m.setCustomer(customer);
        m.setProvider(fleetProfile);
        m.setProviderResponseStatus(ProviderOrderStatus.PENDING_PROVIDER);
        m.setRequestedDate(day);
        m.setStartTime(start);
        m.setExpectedEndTime(end);
        m.setLocationName("TP. Hồ Chí Minh");
        m.setLatitude(new java.math.BigDecimal("10.7769"));
        m.setLongitude(new java.math.BigDecimal("106.7009"));
        return missions.save(m);
    }
}
