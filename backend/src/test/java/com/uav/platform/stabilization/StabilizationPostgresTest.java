package com.uav.platform.stabilization;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.dto.request.*;
import com.uav.platform.modules.inventory.dto.response.*;
import com.uav.platform.modules.inventory.entity.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.inventory.repository.EquipmentRepository;
import com.uav.platform.modules.inventory.service.InventoryService;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.service.impl.MissionOperations;
import com.uav.platform.modules.permission.enums.PermissionCode;
import com.uav.platform.modules.permission.service.PermissionService;
import com.uav.platform.modules.station.dto.request.StationRequest;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.station.service.StationService;
import com.uav.platform.modules.uav.enums.*;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.UserService;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.*;
import java.util.concurrent.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(
        named = "UAV_STABILIZATION_DB_URL",
        matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/uav_(stabilization|ba_test_suite)")
class StabilizationPostgresTest {
    private static final String SCHEMA =
            "stabilization_" + UUID.randomUUID().toString().replace("-", "");

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
        p.add("app.billing.provider-enabled", () -> true);
        p.add("app.billing.ipn-secret", () -> "isolated-test-fixture-key-not-real-provider-2026");
    }

    @Autowired JdbcTemplate db;
    @Autowired com.uav.platform.modules.billing.service.MissionInvoiceService invoiceWorker;
    @Autowired com.uav.platform.modules.billing.repository.MissionBillingJobRepository billingJobs;
    @Autowired com.uav.platform.modules.billing.repository.InvoiceRepository invoices;
    @Autowired com.uav.platform.modules.billing.repository.ServicePlanRepository plans;
    @Autowired com.uav.platform.modules.billing.service.impl.BillingServiceImpl billing;
    @Autowired com.uav.platform.modules.mission.repository.MissionRepository missionRepository;
    @Autowired com.uav.platform.modules.mission.service.MissionService missionService;
    @Autowired com.uav.platform.modules.billing.service.QuotaService quotas;
    @Autowired InventoryService inventory;
    @Autowired EquipmentRepository equipment;
    @Autowired StationService stations;
    @Autowired UserRepository users;
    @Autowired PermissionService permissions;
    @Autowired UserService userService;

    @BeforeEach
    void cleanIsolatedSchema() {
        db.execute(
                "TRUNCATE users,uav_stations,equipment,media_assets,inventory_movements,audit_logs CASCADE");
        db.update(
                "UPDATE system_configurations SET config_value='false' WHERE config_key='billing.auto_generate_invoice'");
        db.update(
                "UPDATE system_configurations SET config_value='' WHERE config_key='billing.hourly_rate_vnd'");
    }

    EquipmentResponse batch(int amount) {
        var item =
                inventory.create(
                        new EquipmentRequest("Battery batch", EquipmentType.BATTERY, null, null),
                        "sample");
        return inventory.stockIn(
                item.id(),
                new QuantityRequest(amount, "sample", "stock-" + UUID.randomUUID()),
                "sample");
    }

    @Test
    void concurrentInitialQuotaCreationHasOneRowAndNoFailures() throws Exception {
        var owner =
                users.save(
                        new AppUser(
                                "quota_initial",
                                "initial@example.test",
                                "hash",
                                null,
                                UserStatus.ACTIVE));
        parallel(8, () -> quotas.getQuotaByUserId(owner.getId()));
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM user_quotas WHERE user_id=?",
                        Integer.class,
                        owner.getId()));
    }

    @Test
    void concurrentQuotaUsagePreservesEveryIncrement() throws Exception {
        var owner =
                users.save(
                        new AppUser(
                                "quota_usage",
                                "usage@example.test",
                                "hash",
                                null,
                                UserStatus.ACTIVE));
        quotas.getQuotaByUserId(owner.getId());
        parallel(
                12,
                () -> {
                    quotas.recordMissionUsage(owner.getId(), 1.0);
                    return null;
                });
        assertEquals(12.0, quotas.getQuotaByUserId(owner.getId()).flightHoursUsed());
    }

    private void parallel(int count, Callable<?> action) throws Exception {
        var pool = Executors.newFixedThreadPool(count);
        var gate = new CountDownLatch(1);
        try {
            var outcomes = new ArrayList<Future<?>>();
            for (int i = 0; i < count; i++)
                outcomes.add(
                        pool.submit(
                                () -> {
                                    gate.await();
                                    return action.call();
                                }));
            gate.countDown();
            for (var result : outcomes) result.get(30, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }
    }

    private AppUser owner(String name) {
        return users.save(
                new AppUser(name, name + "@example.test", "hash", null, UserStatus.ACTIVE));
    }

    private org.springframework.security.core.Authentication auth(AppUser user) {
        return org.springframework.security.authentication.UsernamePasswordAuthenticationToken
                .authenticated(user.getUsername(), "", List.of());
    }

    private com.uav.platform.modules.mission.entity.Mission runningMission(
            AppUser customer, AppUser operator, double hours) {
        var start = java.time.LocalDateTime.of(2026, 10, 17, 10, 0);
        var m =
                MissionOperations.draft(
                        customer,
                        MissionType.UAV_RENTAL,
                        "Billing mission",
                        null,
                        start.toLocalDate(),
                        start,
                        start.plusMinutes(Math.round(hours * 60)),
                        "Site",
                        null,
                        null,
                        MissionPriority.NORMAL,
                        null);
        m.setCode("MSN-TEST-" + UUID.randomUUID().toString().substring(0, 8));
        MissionOperations.assignOperator(m, operator);
        org.springframework.test.util.ReflectionTestUtils.setField(
                m, "status", MissionStatus.IN_PROGRESS);
        return missionRepository.save(m);
    }

    @Test
    void twoCompletedMissionsUsePlannedQuotaOnceAndDefaultBillingIsOff() throws Exception {
        var customer = owner("completion_customer");
        var operator = owner("completion_operator");
        var a = runningMission(customer, operator, 1.5);
        var b = runningMission(customer, operator, 2.0);
        var pool = Executors.newFixedThreadPool(2);
        var gate = new CountDownLatch(1);
        try {
            var results = new ArrayList<Future<?>>();
            for (var m : List.of(a, b))
                results.add(
                        pool.submit(
                                () -> {
                                    gate.await();
                                    return missionService.complete(
                                            m.getId(),
                                            new com.uav.platform.modules.mission.dto.request
                                                    .MissionCompletionRequest("Complete", "Intact"),
                                            auth(operator));
                                }));
            gate.countDown();
            for (var result : results) result.get(30, TimeUnit.SECONDS);
            assertEquals(3.5, quotas.getQuotaByUserId(customer.getId()).flightHoursUsed());
            assertEquals(0, invoices.count());
            assertEquals(0, billingJobs.count());
            assertThrows(
                    IllegalStateException.class,
                    () ->
                            missionService.complete(
                                    a.getId(),
                                    new com.uav.platform.modules.mission.dto.request
                                            .MissionCompletionRequest("Again", "Intact"),
                                    auth(operator)));
            assertEquals(3.5, quotas.getQuotaByUserId(customer.getId()).flightHoursUsed());
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void invoiceFailureIsDurableAndRetryCreatesOneInvoiceWithoutRepeatingUsage() throws Exception {
        var customer = owner("retry_customer");
        var operator = owner("retry_operator");
        var m = runningMission(customer, operator, 2.0);
        db.update(
                "UPDATE system_configurations SET config_value='true' WHERE config_key='billing.auto_generate_invoice'");
        // An explicit synthetic test price, never a production default.
        db.update(
                "UPDATE system_configurations SET config_value='123' WHERE config_key='billing.hourly_rate_vnd'");
        missionService.complete(
                m.getId(),
                new com.uav.platform.modules.mission.dto.request.MissionCompletionRequest(
                        "Complete", "Intact"),
                auth(operator));
        var job = billingJobs.findByMissionId(m.getId()).orElseThrow();
        assertEquals(
                MissionStatus.COMPLETED,
                missionRepository.findById(m.getId()).orElseThrow().getStatus());
        assertEquals(
                "PENDING", missionRepository.findById(m.getId()).orElseThrow().getBillingStatus());
        db.execute(
                "CREATE FUNCTION reject_test_invoice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected invoice storage failure'; END $$");
        db.execute(
                "CREATE TRIGGER reject_test_invoice BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION reject_test_invoice()");
        try {
            invoiceWorker.process(job.getId());
        } finally {
            db.execute("DROP TRIGGER reject_test_invoice ON invoices");
            db.execute("DROP FUNCTION reject_test_invoice()");
        }
        var failed = billingJobs.findById(job.getId()).orElseThrow();
        assertEquals("ERROR", failed.getStatus());
        assertEquals(1, failed.getAttempts());
        assertEquals("INVOICE_STORAGE_FAILURE", failed.getLastError());
        assertEquals(
                "ERROR", missionRepository.findById(m.getId()).orElseThrow().getBillingStatus());
        assertEquals(0, invoices.count());
        parallel(
                4,
                () -> {
                    invoiceWorker.process(job.getId());
                    return null;
                });
        assertEquals(1, invoices.count());
        assertEquals("ISSUED", billingJobs.findById(job.getId()).orElseThrow().getStatus());
        assertEquals(
                0,
                new java.math.BigDecimal("246")
                        .compareTo(invoices.findAll().getFirst().getAmount()));
        assertEquals(2.0, quotas.getQuotaByUserId(customer.getId()).flightHoursUsed());
        assertThrows(
                org.springframework.security.access.AccessDeniedException.class,
                () ->
                        missionService.complete(
                                m.getId(),
                                new com.uav.platform.modules.mission.dto.request
                                        .MissionCompletionRequest("Bad", "Intact"),
                                auth(owner("stranger_completion"))));
    }

    @Test
    void invoiceConflictHasSafeDiagnosticCategoryAndPreservesExistingInvoice() {
        var customer = owner("conflict_customer");
        var operator = owner("conflict_operator");
        var mission = runningMission(customer, operator, 1);
        org.springframework.test.util.ReflectionTestUtils.setField(
                mission, "status", MissionStatus.COMPLETED);
        missionRepository.save(mission);
        var invoice =
                invoices.save(
                        new com.uav.platform.modules.billing.entity.Invoice(
                                "INV-MISSION-" + mission.getId(),
                                customer,
                                mission,
                                null,
                                new java.math.BigDecimal("123.45"),
                                java.time.LocalDateTime.now().plusDays(7),
                                "Existing invoice"));
        var job =
                billingJobs.save(
                        new com.uav.platform.modules.billing.entity.MissionBillingJob(
                                mission, 1, new java.math.BigDecimal("123.45")));
        invoiceWorker.process(job.getId());
        var failed = billingJobs.findById(job.getId()).orElseThrow();
        assertEquals("ERROR", failed.getStatus());
        assertEquals("INVOICE_DATA_CONFLICT", failed.getLastError());
        assertEquals(1, invoices.count());
        assertEquals(invoice.getCode(), invoices.findAll().getFirst().getCode());
        assertEquals(
                MissionStatus.COMPLETED,
                missionRepository.findById(mission.getId()).orElseThrow().getStatus());
    }

    @Test
    void failedOldBillingBacklogYieldsToHealthyJobBeyondFirstBatch() {
        var customer = owner("fair_queue_customer");
        var operator = owner("fair_queue_operator");
        Long healthyJob = null;
        for (int i = 0; i < 51; i++) {
            var mission = runningMission(customer, operator, 1);
            org.springframework.test.util.ReflectionTestUtils.setField(
                    mission, "status", MissionStatus.COMPLETED);
            missionRepository.save(mission);
            var amount = i < 50 ? null : new java.math.BigDecimal("123.45");
            var job =
                    new com.uav.platform.modules.billing.entity.MissionBillingJob(
                            mission, 1, amount);
            job.setNextAttemptAt(java.time.LocalDateTime.now().minusHours(i < 50 ? 2 : 1));
            var saved = billingJobs.save(job);
            if (i == 50) healthyJob = saved.getId();
        }
        org.springframework.test.util.ReflectionTestUtils.setField(
                invoiceWorker, "workerEnabled", true);
        try {
            invoiceWorker.retryDue();
            assertEquals(
                    50,
                    db.queryForObject(
                            "SELECT count(*) FROM mission_billing_jobs WHERE status='ERROR'",
                            Integer.class));
            assertEquals("PENDING", billingJobs.findById(healthyJob).orElseThrow().getStatus());
            // Simulate the next scheduled cycle without a wall-clock sleep: failed retries are
            // due again, while the healthy never-attempted job retains an older due time.
            db.update(
                    "UPDATE mission_billing_jobs SET next_attempt_at=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE status='ERROR'");
            invoiceWorker.retryDue();
            assertEquals("ISSUED", billingJobs.findById(healthyJob).orElseThrow().getStatus());
            assertEquals(1, invoices.count());
            invoiceWorker.retryDue();
            assertEquals(1, invoices.count());
            assertEquals(
                    "INVOICE_PRICE_NOT_CONFIGURED",
                    billingJobs.findAll().stream()
                            .filter(j -> "ERROR".equals(j.getStatus()))
                            .findFirst()
                            .orElseThrow()
                            .getLastError());
        } finally {
            org.springframework.test.util.ReflectionTestUtils.setField(
                    invoiceWorker, "workerEnabled", false);
        }
    }

    private com.uav.platform.modules.billing.entity.Invoice invoice(
            AppUser customer,
            com.uav.platform.modules.mission.entity.Mission mission,
            com.uav.platform.modules.billing.entity.ServicePlan plan) {
        return invoices.save(
                new com.uav.platform.modules.billing.entity.Invoice(
                        "INV-TEST-" + UUID.randomUUID().toString().substring(0, 8),
                        customer,
                        mission,
                        plan,
                        new java.math.BigDecimal("100.00"),
                        java.time.LocalDateTime.now().plusDays(7),
                        null));
    }

    private com.uav.platform.modules.billing.dto.request.PaymentIpnRequest ipn(
            com.uav.platform.modules.billing.entity.Invoice inv,
            String transaction,
            String status) {
        return new com.uav.platform.modules.billing.dto.request.PaymentIpnRequest(
                inv.getCode(),
                inv.getId(),
                transaction,
                new java.math.BigDecimal("100.00"),
                status);
    }

    @Test
    void verifiedPlanPaymentAndConcurrentReplayApplyOnlyPlanLimitsPreservingUsageAndCycle()
            throws Exception {
        var customer = owner("payment_customer");
        quotas.recordMissionUsage(customer.getId(), 3.5);
        var before = quotas.getQuotaByUserId(customer.getId());
        var plan =
                com.uav.platform.modules.billing.service.impl.ServicePlanOperations.create(
                        "PAID-TEST",
                        "Paid test",
                        java.math.BigDecimal.valueOf(100),
                        "MONTHLY",
                        80.0,
                        3,
                        false,
                        null);
        var planId =
                db.queryForObject(
                        "INSERT INTO service_plans(code,name,price,billing_cycle,max_monthly_flight_hours,max_concurrent_uavs,allow_sar_ai,active) VALUES('PAID-TEST','Paid test',100,'MONTHLY',80,3,false,true) RETURNING id",
                        Long.class);
        plan.setId(planId);
        var inv = invoice(customer, null, plan);
        var request = ipn(inv, "PLAN-REPLAY", "SUCCESS");
        var signature = billing.computeIpnSignature(request);
        parallel(8, () -> billing.processPaymentIpn(request, signature, null));
        var after = quotas.getQuotaByUserId(customer.getId());
        assertEquals(80.0, after.flightHoursLimit());
        assertEquals(3.5, after.flightHoursUsed());
        assertEquals(before.cycleStart(), after.cycleStart());
        assertEquals(before.cycleEnd(), after.cycleEnd());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM payment_transactions WHERE transaction_code='PLAN-REPLAY'",
                        Integer.class));
        assertEquals(
                com.uav.platform.modules.billing.enums.InvoiceStatus.PAID,
                invoices.findById(inv.getId()).orElseThrow().getStatus());
        var another = invoice(customer, null, null);
        var reused = ipn(another, "PLAN-REPLAY", "SUCCESS");
        assertEquals(
                org.springframework.http.HttpStatus.CONFLICT,
                assertThrows(
                                SystemException.class,
                                () ->
                                        billing.processPaymentIpn(
                                                reused, billing.computeIpnSignature(reused), null))
                        .getStatus());
    }

    @Test
    void missionPaymentDoesNotGrantHoursAndInvalidProofCannotMutate() {
        var customer = owner("mission_payment_customer");
        var operator = owner("mission_payment_operator");
        var mission = runningMission(customer, operator, 2);
        quotas.recordMissionUsage(customer.getId(), 2);
        var before = quotas.getQuotaByUserId(customer.getId());
        var inv = invoice(customer, mission, null);
        var failed = ipn(inv, "MISSION-TX", "FAILED");
        assertEquals(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                assertThrows(
                                SystemException.class,
                                () ->
                                        billing.processPaymentIpn(
                                                failed,
                                                billing.computeIpnSignature(failed),
                                                auth(customer)))
                        .getStatus());
        var success = ipn(inv, "MISSION-TX", "SUCCESS");
        assertEquals(
                org.springframework.http.HttpStatus.UNAUTHORIZED,
                assertThrows(
                                SystemException.class,
                                () ->
                                        billing.processPaymentIpn(
                                                success,
                                                billing.computeIpnSignature(failed),
                                                auth(customer)))
                        .getStatus());
        assertEquals(
                org.springframework.http.HttpStatus.UNAUTHORIZED,
                assertThrows(
                                SystemException.class,
                                () ->
                                        billing.processPaymentIpn(
                                                success,
                                                "isolated-test-fixture-key-not-real-provider-2026",
                                                auth(customer)))
                        .getStatus());
        assertEquals(
                org.springframework.http.HttpStatus.UNAUTHORIZED,
                assertThrows(
                                SystemException.class,
                                () -> billing.processPaymentIpn(success, null, auth(customer)))
                        .getStatus());
        var mismatch =
                new com.uav.platform.modules.billing.dto.request.PaymentIpnRequest(
                        inv.getCode(), inv.getId() + 1, "MISMATCH", inv.getAmount(), "SUCCESS");
        assertEquals(
                org.springframework.http.HttpStatus.CONFLICT,
                assertThrows(
                                SystemException.class,
                                () ->
                                        billing.processPaymentIpn(
                                                mismatch,
                                                billing.computeIpnSignature(mismatch),
                                                null))
                        .getStatus());
        billing.processPaymentIpn(success, billing.computeIpnSignature(success), null);
        var after = quotas.getQuotaByUserId(customer.getId());
        assertEquals(before.flightHoursLimit(), after.flightHoursLimit());
        assertEquals(before.flightHoursUsed(), after.flightHoursUsed());
        assertEquals(before.cycleEnd(), after.cycleEnd());
    }

    @Test
    void failedPaymentStorageRollsBackFinancialStateAndPlanChange() {
        var customer = owner("rollback_payment");
        quotas.recordMissionUsage(customer.getId(), 2);
        var paidPlan =
                plans.save(
                        com.uav.platform.modules.billing.service.impl.ServicePlanOperations.create(
                                "ROLLBACK-PLAN",
                                "Rollback test",
                                java.math.BigDecimal.valueOf(100),
                                "MONTHLY",
                                90.0,
                                3,
                                false,
                                null));
        var inv = invoice(customer, null, paidPlan);
        var request = ipn(inv, "ROLLBACK-TX", "SUCCESS");
        db.execute(
                "CREATE FUNCTION reject_test_payment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected payment storage failure'; END $$");
        db.execute(
                "CREATE TRIGGER reject_test_payment BEFORE INSERT ON payment_transactions FOR EACH ROW EXECUTE FUNCTION reject_test_payment()");
        try {
            assertThrows(
                    RuntimeException.class,
                    () ->
                            billing.processPaymentIpn(
                                    request, billing.computeIpnSignature(request), null));
        } finally {
            db.execute("DROP TRIGGER reject_test_payment ON payment_transactions");
            db.execute("DROP FUNCTION reject_test_payment()");
        }
        assertEquals(
                com.uav.platform.modules.billing.enums.InvoiceStatus.PENDING,
                invoices.findById(inv.getId()).orElseThrow().getStatus());
        assertNull(invoices.findById(inv.getId()).orElseThrow().getPaidAt());
        assertEquals(
                0, db.queryForObject("SELECT count(*) FROM payment_transactions", Integer.class));
        assertEquals(2, quotas.getQuotaByUserId(customer.getId()).flightHoursUsed());
        assertEquals(20.0, quotas.getQuotaByUserId(customer.getId()).flightHoursLimit());
    }

    @Test
    void concurrentReservationsCannotOverAllocateAndHaveMatchingAudit() throws Exception {
        var item = batch(5);
        var pool = Executors.newFixedThreadPool(8);
        var gate = new CountDownLatch(1);
        try {
            List<Future<Boolean>> outcomes = new ArrayList<>();
            for (int i = 0; i < 8; i++)
                outcomes.add(
                        pool.submit(
                                () -> {
                                    gate.await();
                                    try {
                                        inventory.reserve(
                                                item.id(),
                                                new QuantityRequest(
                                                        1, "reserve", UUID.randomUUID().toString()),
                                                "sample");
                                        return true;
                                    } catch (IllegalStateException ex) {
                                        return false;
                                    }
                                }));
            gate.countDown();
            long successes = 0;
            for (var outcome : outcomes) if (outcome.get(20, TimeUnit.SECONDS)) successes++;
            assertEquals(5, successes);
            var finalItem = inventory.get(item.id());
            assertEquals(0, finalItem.availableQuantity());
            assertEquals(5, finalItem.reservedQuantity());
            assertEquals(
                    5,
                    db.queryForObject(
                            "SELECT count(*) FROM inventory_movements WHERE type='RESERVE'",
                            Integer.class));
            assertEquals(
                    5,
                    db.queryForObject(
                            "SELECT count(*) FROM audit_logs WHERE action='RESERVE'",
                            Integer.class));
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void simultaneousReplayAppliesOnlyOnceAndRejectsPayloadReuse() throws Exception {
        var item = batch(5);
        var pool = Executors.newFixedThreadPool(4);
        var gate = new CountDownLatch(1);
        try {
            List<Future<EquipmentResponse>> outcomes = new ArrayList<>();
            for (int i = 0; i < 4; i++)
                outcomes.add(
                        pool.submit(
                                () -> {
                                    gate.await();
                                    return inventory.reserve(
                                            item.id(),
                                            new QuantityRequest(2, "same", "same-id"),
                                            "sample");
                                }));
            gate.countDown();
            for (var outcome : outcomes) outcome.get(20, TimeUnit.SECONDS);
            assertEquals(3, inventory.get(item.id()).availableQuantity());
            assertEquals(
                    1,
                    db.queryForObject(
                            "SELECT count(*) FROM inventory_movements WHERE request_id='same-id'",
                            Integer.class));
            assertThrows(
                    SystemException.class,
                    () ->
                            inventory.reserve(
                                    item.id(),
                                    new QuantityRequest(3, "same", "same-id"),
                                    "sample"));
            inventory.release(item.id(), new QuantityRequest(2, "return", "return-id"), "sample");
            inventory.release(item.id(), new QuantityRequest(2, "return", "return-id"), "sample");
            assertEquals(5, inventory.get(item.id()).availableQuantity());
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void invalidQuantitiesRollbackMovementAndAudit() {
        var item = batch(3);
        assertThrows(
                IllegalArgumentException.class,
                () -> inventory.reserve(item.id(), new QuantityRequest(-1, "bad"), "sample"));
        assertThrows(
                IllegalStateException.class,
                () -> inventory.reserve(item.id(), new QuantityRequest(4, "bad"), "sample"));
        assertThrows(
                IllegalStateException.class,
                () -> inventory.release(item.id(), new QuantityRequest(1, "bad"), "sample"));
        assertEquals(3, inventory.get(item.id()).availableQuantity());
        assertEquals(
                1, db.queryForObject("SELECT count(*) FROM inventory_movements", Integer.class));
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT count(*) FROM audit_logs WHERE action IN ('RESERVE','RELEASE')",
                        Integer.class));
    }

    @Test
    void concurrentTransferReplayAndChangedPayloadAreStable() throws Exception {
        var a =
                stations.create(
                        new StationRequest("TRANSFER-A", "Source", null, null, null, null),
                        "sample");
        var b =
                stations.create(
                        new StationRequest("TRANSFER-B", "Target", null, null, null, null),
                        "sample");
        var item =
                inventory.create(
                        new EquipmentRequest("Transfer batch", EquipmentType.BATTERY, null, a.id()),
                        "sample");
        inventory.stockIn(item.id(), new QuantityRequest(10, "seed"), "sample");
        parallel(
                6,
                () ->
                        inventory.transfer(
                                item.id(),
                                b.id(),
                                new QuantityRequest(4, "same", "transfer-replay"),
                                "sample"));
        assertEquals(6, inventory.get(item.id()).quantity());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM inventory_movements WHERE request_id='transfer-replay'",
                        Integer.class));
        var changed =
                assertThrows(
                        SystemException.class,
                        () ->
                                inventory.transfer(
                                        item.id(),
                                        b.id(),
                                        new QuantityRequest(3, "same", "transfer-replay"),
                                        "sample"));
        assertEquals(org.springframework.http.HttpStatus.CONFLICT, changed.getStatus());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM audit_logs WHERE action='TRANSFER'", Integer.class));
    }

    @Test
    void requestReuseAcrossEquipmentReturnsConflictAndRollsBackLoser() throws Exception {
        var a = batch(5);
        var b = batch(5);
        var pool = Executors.newFixedThreadPool(2);
        var gate = new CountDownLatch(1);
        try {
            var results = new ArrayList<Future<Boolean>>();
            for (var item : List.of(a, b))
                results.add(
                        pool.submit(
                                () -> {
                                    gate.await();
                                    try {
                                        inventory.reserve(
                                                item.id(),
                                                new QuantityRequest(2, "same", "cross-equipment"),
                                                "sample");
                                        return true;
                                    } catch (SystemException ex) {
                                        assertEquals(
                                                org.springframework.http.HttpStatus.CONFLICT,
                                                ex.getStatus());
                                        return false;
                                    }
                                }));
            gate.countDown();
            int successes = 0;
            for (var result : results) if (result.get(20, TimeUnit.SECONDS)) successes++;
            assertEquals(1, successes);
            assertEquals(
                    8,
                    inventory.get(a.id()).availableQuantity()
                            + inventory.get(b.id()).availableQuantity());
            assertEquals(
                    1,
                    db.queryForObject(
                            "SELECT count(*) FROM inventory_movements WHERE request_id='cross-equipment'",
                            Integer.class));
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void fullAndPartialTransfersPreservePerStationStock() {
        var a =
                stations.create(
                        new StationRequest("SAMPLE-A", "Source", null, null, null, null), "sample");
        var b =
                stations.create(
                        new StationRequest("SAMPLE-B", "Target", null, null, null, null), "sample");
        var source =
                inventory.create(
                        new EquipmentRequest("Batteries", EquipmentType.BATTERY, null, a.id()),
                        "sample");
        inventory.stockIn(source.id(), new QuantityRequest(10, "seed"), "sample");
        inventory.transfer(
                source.id(), b.id(), new QuantityRequest(4, "partial", "partial-id"), "sample");
        assertEquals(6, inventory.get(source.id()).quantity());
        assertEquals(a.id(), inventory.get(source.id()).stationId());
        assertEquals(
                4,
                db.queryForObject(
                        "SELECT sum(quantity) FROM equipment WHERE station_id=?",
                        Integer.class,
                        b.id()));
        inventory.transfer(
                source.id(), b.id(), new QuantityRequest(6, "full", "full-id"), "sample");
        inventory.transfer(
                source.id(), b.id(), new QuantityRequest(6, "full", "full-id"), "sample");
        assertEquals(b.id(), inventory.get(source.id()).stationId());
        assertEquals(
                10,
                db.queryForObject(
                        "SELECT sum(quantity) FROM equipment WHERE station_id=?",
                        Integer.class,
                        b.id()));
        assertEquals(
                2,
                db.queryForObject(
                        "SELECT count(*) FROM inventory_movements WHERE type='TRANSFER'",
                        Integer.class));
        assertEquals(
                2,
                db.queryForObject(
                        "SELECT count(*) FROM audit_logs WHERE action='TRANSFER'", Integer.class));
    }

    @Test
    void concurrentRecoveryRevocationsRetainOneEffectiveManager() throws Exception {
        var a =
                users.save(
                        new AppUser(
                                "manager_a", "a@example.test", "hash", null, UserStatus.ACTIVE));
        var b =
                users.save(
                        new AppUser(
                                "manager_b", "b@example.test", "hash", null, UserStatus.ACTIVE));
        for (var u : List.of(a, b)) {
            permissions.setUserPermission(
                    u.getId(), PermissionCode.PERMISSION_MANAGE, true, "setup");
            permissions.setUserPermission(u.getId(), PermissionCode.USER_MANAGE, true, "setup");
        }
        var pool = Executors.newFixedThreadPool(2);
        var gate = new CountDownLatch(1);
        try {
            List<Future<Boolean>> results = new ArrayList<>();
            for (var u : List.of(a, b))
                results.add(
                        pool.submit(
                                () -> {
                                    gate.await();
                                    try {
                                        permissions.setUserPermission(
                                                u.getId(),
                                                PermissionCode.PERMISSION_MANAGE,
                                                false,
                                                "sample");
                                        return true;
                                    } catch (SystemException ex) {
                                        return false;
                                    }
                                }));
            gate.countDown();
            int success = 0;
            for (var result : results) if (result.get(20, TimeUnit.SECONDS)) success++;
            assertEquals(1, success);
        } finally {
            pool.shutdownNow();
        }
    }
}
