package com.uav.platform.stabilization;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.billing.dto.request.*;
import com.uav.platform.modules.billing.service.impl.BillingServiceImpl;
import com.uav.platform.modules.notification.service.NotificationService;
import com.uav.platform.modules.permission.enums.PermissionCode;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.webhook.repository.FinancialOutboxRepository;
import com.uav.platform.modules.webhook.service.FinancialOutboxService;
import com.uav.platform.modules.webhook.service.impl.WebhookServiceImpl;
import com.uav.platform.modules.webhook.transport.WebhookTransport;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.*;
import java.util.concurrent.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(
        named = "UAV_STABILIZATION_DB_URL",
        matches = "jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/uav_ba_test_suite")
class FinancialOutboxPostgresTest {
    private static final String SCHEMA = "outbox_" + UUID.randomUUID().toString().replace("-", "");

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
        p.add("app.financial-outbox.worker-enabled", () -> false);
        p.add("app.webhook.retry-delay-ms", () -> 3600000);
        p.add("app.billing.provider-enabled", () -> true);
        p.add("app.billing.ipn-secret", () -> "isolated-test-fixture-key-not-real-provider-2026");
    }

    @Autowired JdbcTemplate db;
    @Autowired BillingServiceImpl billing;
    @Autowired FinancialOutboxService outbox;
    @Autowired FinancialOutboxRepository events;
    @Autowired WebhookServiceImpl hooks;
    @Autowired NotificationService notifications;
    @Autowired PlatformTransactionManager manager;
    @Autowired com.uav.platform.modules.user.repository.UserRepository users;
    @Autowired com.uav.platform.modules.permission.service.PermissionService permissions;
    @Autowired com.uav.platform.modules.billing.repository.InvoiceRepository invoices;
    @Autowired com.uav.platform.modules.webhook.repository.WebhookDeliveryLogRepository logs;

    @Autowired
    com.uav.platform.modules.webhook.repository.WebhookSubscriptionRepository subscriptions;

    @BeforeEach
    void reset() {
        db.execute("TRUNCATE users,webhook_subscriptions CASCADE");
    }

    @Test
    void financialCommitSurvivesNotificationFailureAndNewWorkerReplaysOnce() throws Exception {
        var owner =
                users.save(
                        new AppUser(
                                "outbox_owner",
                                "outbox@example.test",
                                "hash",
                                null,
                                UserStatus.ACTIVE));
        permissions.setUserPermission(owner.getId(), PermissionCode.USER_MANAGE, true, "fixture");
        var auth =
                org.springframework.security.authentication.UsernamePasswordAuthenticationToken
                        .authenticated(owner.getUsername(), "", List.of());
        hooks.createSubscription(
                "Fixture",
                "https://receiver.example.test/events",
                "fixture-secret",
                "INVOICE_ISSUED,PAYMENT_COMPLETED");
        var response =
                billing.createInvoice(
                        new CreateInvoiceRequest(
                                owner.getId(),
                                null,
                                null,
                                new java.math.BigDecimal("100"),
                                "fixture"),
                        auth);
        String id = "INVOICE_ISSUED:" + response.id();
        assertEquals("PENDING", events.findById(id).orElseThrow().getStatus());
        db.execute(
                "CREATE FUNCTION fail_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture'; END $$");
        db.execute(
                "CREATE TRIGGER fail_notice BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION fail_notice()");
        try {
            outbox.process(id);
        } finally {
            db.execute("DROP TRIGGER fail_notice ON notifications");
            db.execute("DROP FUNCTION fail_notice()");
        }
        assertTrue(invoices.existsById(response.id()));
        assertEquals("PENDING", events.findById(id).orElseThrow().getStatus());
        assertEquals(
                0, db.queryForObject("SELECT count(*) FROM webhook_delivery_logs", Integer.class));
        var restarted = new FinancialOutboxService(events, notifications, hooks, manager);
        var pool = Executors.newFixedThreadPool(4);
        try {
            var tasks = new ArrayList<Future<?>>();
            for (int i = 0; i < 4; i++) tasks.add(pool.submit(() -> restarted.process(id)));
            for (var task : tasks) task.get(20, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }
        assertEquals("LOCAL_COMPLETED", events.findById(id).orElseThrow().getStatus());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM notifications WHERE reference_id=?",
                        Integer.class,
                        response.id()));
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM webhook_delivery_logs WHERE event_id=?",
                        Integer.class,
                        id));
        var request =
                new PaymentIpnRequest(
                        response.code(),
                        response.id(),
                        "OUTBOX-PAYMENT",
                        new java.math.BigDecimal("100"),
                        "SUCCESS");
        billing.processPaymentIpn(request, billing.computeIpnSignature(request), null);
        billing.processPaymentIpn(request, billing.computeIpnSignature(request), null);
        String paymentId = "PAYMENT_COMPLETED:" + response.id();
        restarted.process(paymentId);
        restarted.process(paymentId);
        assertEquals(
                1, db.queryForObject("SELECT count(*) FROM payment_transactions", Integer.class));
        assertEquals(
                2,
                db.queryForObject(
                        "SELECT count(*) FROM notifications WHERE reference_id=?",
                        Integer.class,
                        response.id()));
        assertEquals(2, events.count());
        var transport = mock(WebhookTransport.class);
        when(transport.post(anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenReturn(503);
        Object original = ReflectionTestUtils.getField(hooks, "transport");
        ReflectionTestUtils.setField(hooks, "transport", transport);
        ReflectionTestUtils.setField(hooks, "enabled", true);
        ReflectionTestUtils.setField(hooks, "approvedUrls", "https://receiver.example.test/events");
        try {
            Long delivery =
                    db.queryForObject(
                            "SELECT id FROM webhook_delivery_logs WHERE event_id=?",
                            Long.class,
                            paymentId);
            for (int i = 0; i < 5; i++) {
                db.update(
                        "UPDATE webhook_delivery_logs SET next_attempt_at=CURRENT_TIMESTAMP WHERE id=?",
                        delivery);
                hooks.processDelivery(delivery);
            }
            var entry = logs.findById(delivery).orElseThrow();
            assertEquals(3, entry.getRetryCount());
            assertEquals("FAILED", entry.getDeliveryStatus());
            verify(transport, times(3))
                    .post(
                            anyString(),
                            anyString(),
                            anyString(),
                            eq("PAYMENT_COMPLETED"),
                            eq(paymentId));
            assertEquals(
                    com.uav.platform.modules.billing.enums.InvoiceStatus.PAID,
                    invoices.findById(response.id()).orElseThrow().getStatus());
            assertEquals(
                    2,
                    db.queryForObject(
                            "SELECT count(*) FROM notifications WHERE reference_id=?",
                            Integer.class,
                            response.id()));
        } finally {
            ReflectionTestUtils.setField(hooks, "transport", original);
            ReflectionTestUtils.setField(hooks, "enabled", false);
            ReflectionTestUtils.setField(hooks, "approvedUrls", "");
        }
    }

    @Test
    void noSubscriberRetainsEventAndRestartDoesNotRepeatLocalNotification() {
        var owner =
                users.save(
                        new AppUser(
                                "waiting_owner",
                                "waiting@example.test",
                                "hash",
                                null,
                                UserStatus.ACTIVE));
        permissions.setUserPermission(owner.getId(), PermissionCode.USER_MANAGE, true, "fixture");
        var auth =
                org.springframework.security.authentication.UsernamePasswordAuthenticationToken
                        .authenticated(owner.getUsername(), "", List.of());
        var invoice =
                billing.createInvoice(
                        new CreateInvoiceRequest(
                                owner.getId(),
                                null,
                                null,
                                new java.math.BigDecimal("100"),
                                "fixture"),
                        auth);
        String id = "INVOICE_ISSUED:" + invoice.id();
        outbox.process(id);
        assertEquals("WAITING_SUBSCRIBERS", events.findById(id).orElseThrow().getStatus());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM notifications WHERE reference_id=?",
                        Integer.class,
                        invoice.id()));
        var restarted = new FinancialOutboxService(events, notifications, hooks, manager);
        restarted.process(id);
        hooks.createSubscription(
                "Fixture",
                "https://receiver.example.test/events",
                "fixture-secret",
                "INVOICE_ISSUED");
        restarted.process(id);
        assertEquals("LOCAL_COMPLETED", events.findById(id).orElseThrow().getStatus());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT count(*) FROM notifications WHERE reference_id=?",
                        Integer.class,
                        invoice.id()));
        assertEquals(
                "UNCONFIGURED",
                db.queryForObject(
                        "SELECT delivery_status FROM webhook_delivery_logs WHERE event_id=?",
                        String.class,
                        id));
    }

    @Test
    void financialWriteAndEventAreAtomicWhenOutboxStorageFails() {
        var owner =
                users.save(
                        new AppUser(
                                "atomic_owner",
                                "atomic@example.test",
                                "hash",
                                null,
                                UserStatus.ACTIVE));
        permissions.setUserPermission(owner.getId(), PermissionCode.USER_MANAGE, true, "fixture");
        var auth =
                org.springframework.security.authentication.UsernamePasswordAuthenticationToken
                        .authenticated(owner.getUsername(), "", List.of());
        db.execute(
                "CREATE FUNCTION fail_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture'; END $$");
        db.execute(
                "CREATE TRIGGER fail_event BEFORE INSERT ON financial_outbox_events FOR EACH ROW EXECUTE FUNCTION fail_event()");
        try {
            assertThrows(
                    RuntimeException.class,
                    () ->
                            billing.createInvoice(
                                    new CreateInvoiceRequest(
                                            owner.getId(),
                                            null,
                                            null,
                                            new java.math.BigDecimal("100"),
                                            "fixture"),
                                    auth));
        } finally {
            db.execute("DROP TRIGGER fail_event ON financial_outbox_events");
            db.execute("DROP FUNCTION fail_event()");
        }
        assertEquals(0, invoices.count());
        assertEquals(0, events.count());
    }

    @Test
    void removingDestinationRetainsFinancialDeliveryAndPreventsFreshWorkerSend() throws Exception {
        var owner =
                users.save(
                        new AppUser(
                                "removed_owner",
                                "removed@example.test",
                                "hash",
                                null,
                                UserStatus.ACTIVE));
        permissions.setUserPermission(owner.getId(), PermissionCode.USER_MANAGE, true, "fixture");
        var auth =
                org.springframework.security.authentication.UsernamePasswordAuthenticationToken
                        .authenticated(owner.getUsername(), "", List.of());
        var subscription =
                hooks.createSubscription(
                        "Fixture",
                        "https://receiver.example.test/events",
                        "fixture-secret",
                        "INVOICE_ISSUED,PAYMENT_COMPLETED");
        var invoice =
                billing.createInvoice(
                        new CreateInvoiceRequest(
                                owner.getId(),
                                null,
                                null,
                                new java.math.BigDecimal("100"),
                                "fixture"),
                        auth);
        var payment =
                new PaymentIpnRequest(
                        invoice.code(),
                        invoice.id(),
                        "REMOVED-PAYMENT",
                        new java.math.BigDecimal("100"),
                        "SUCCESS");
        billing.processPaymentIpn(payment, billing.computeIpnSignature(payment), null);
        String issued = "INVOICE_ISSUED:" + invoice.id(),
                paid = "PAYMENT_COMPLETED:" + invoice.id();
        outbox.process(issued);
        outbox.process(paid);
        Long pendingId =
                db.queryForObject(
                        "SELECT id FROM webhook_delivery_logs WHERE event_id=?",
                        Long.class,
                        issued);
        Long retryId =
                db.queryForObject(
                        "SELECT id FROM webhook_delivery_logs WHERE event_id=?", Long.class, paid);
        db.update(
                "UPDATE webhook_delivery_logs SET delivery_status='RETRYING',retry_count=1,response_status_code=503 WHERE id=?",
                retryId);
        var failed =
                new com.uav.platform.modules.webhook.entity.WebhookDeliveryLog(
                        logs.findById(pendingId).orElseThrow().getSubscription(),
                        "TEST",
                        "{}",
                        503,
                        "HTTP_REJECTED",
                        1,
                        false);
        failed.setEventId("historic-failed");
        failed.setDeliveryStatus("FAILED");
        failed = logs.save(failed);
        long originalLogs = logs.count();
        hooks.deleteSubscription(subscription.id());
        assertEquals(
                originalLogs,
                logs.count(),
                "Removing a destination must retain queued and failed evidence");
        assertThrows(
                org.springframework.dao.DataIntegrityViolationException.class,
                () -> db.update("DELETE FROM webhook_subscriptions WHERE id=?", subscription.id()),
                "Database must also refuse an accidental cascading hard delete");
        assertEquals("CANCELLED", logs.findById(pendingId).orElseThrow().getDeliveryStatus());
        assertEquals("CANCELLED", logs.findById(retryId).orElseThrow().getDeliveryStatus());
        assertEquals("FAILED", logs.findById(failed.getId()).orElseThrow().getDeliveryStatus());
        assertTrue(hooks.listSubscriptions().isEmpty());
        assertThrows(
                com.uav.platform.error.SystemException.class,
                () -> hooks.toggleSubscription(subscription.id(), true));
        var freshHooks = new WebhookServiceImpl(subscriptions, logs, null);
        var transport = mock(WebhookTransport.class);
        ReflectionTestUtils.setField(freshHooks, "transactionManager", manager);
        ReflectionTestUtils.setField(freshHooks, "transport", transport);
        ReflectionTestUtils.setField(freshHooks, "enabled", true);
        ReflectionTestUtils.setField(
                freshHooks, "approvedUrls", "https://receiver.example.test/events");
        freshHooks.processDelivery(pendingId);
        freshHooks.processDelivery(retryId);
        freshHooks.retryDue();
        new FinancialOutboxService(events, notifications, hooks, manager).process(issued);
        new FinancialOutboxService(events, notifications, hooks, manager).process(paid);
        verifyNoInteractions(transport);
        assertEquals(originalLogs, logs.count());
        assertEquals("CANCELLED", logs.findById(pendingId).orElseThrow().getDeliveryStatus());
        assertEquals("CANCELLED", logs.findById(retryId).orElseThrow().getDeliveryStatus());
        assertEquals("DESTINATION_REMOVED", logs.findById(retryId).orElseThrow().getResponseBody());
        assertEquals(issued, logs.findById(pendingId).orElseThrow().getEventId());
        assertEquals(paid, logs.findById(retryId).orElseThrow().getEventId());
        assertEquals(1, invoices.count());
        assertEquals(
                1, db.queryForObject("SELECT count(*) FROM payment_transactions", Integer.class));
        assertEquals(
                2,
                db.queryForObject(
                        "SELECT count(*) FROM notifications WHERE reference_id=?",
                        Integer.class,
                        invoice.id()));
        assertEquals(2, events.count());
        assertEquals(
                com.uav.platform.modules.billing.enums.InvoiceStatus.PAID,
                invoices.findById(invoice.id()).orElseThrow().getStatus());
    }

    @Test
    void webhookBatchOfFiveAdvancesPastFailingOldestBacklog() throws Exception {
        hooks.createSubscription(
                "Fixture", "https://receiver.example.test/events", "fixture-secret", "TEST");
        for (int i = 0; i < 12; i++) hooks.dispatchEvent("TEST", Map.of("ordinal", i));
        var ordered =
                db.queryForList("SELECT id FROM webhook_delivery_logs ORDER BY id", Long.class);
        var firstFive =
                new HashSet<>(
                        db.queryForList(
                                "SELECT event_id FROM webhook_delivery_logs ORDER BY id LIMIT 5",
                                String.class));
        for (int i = 0; i < ordered.size(); i++)
            db.update(
                    "UPDATE webhook_delivery_logs SET next_attempt_at=TIMESTAMP '2020-01-01' + (? * INTERVAL '1 second') WHERE id=?",
                    i,
                    ordered.get(i));
        var transport = mock(WebhookTransport.class);
        when(transport.post(anyString(), anyString(), anyString(), anyString(), anyString()))
                .thenAnswer(
                        call -> firstFive.contains(call.getArgument(4, String.class)) ? 503 : 204);
        var fresh = new WebhookServiceImpl(subscriptions, logs, null);
        ReflectionTestUtils.setField(fresh, "transactionManager", manager);
        ReflectionTestUtils.setField(fresh, "transport", transport);
        ReflectionTestUtils.setField(fresh, "enabled", true);
        ReflectionTestUtils.setField(fresh, "approvedUrls", "https://receiver.example.test/events");
        fresh.retryDue();
        assertEquals(
                5,
                db.queryForObject(
                        "SELECT count(*) FROM webhook_delivery_logs WHERE retry_count=1",
                        Integer.class));
        assertEquals(
                5,
                db.queryForObject(
                        "SELECT count(*) FROM webhook_delivery_logs WHERE delivery_status='RETRYING'",
                        Integer.class));
        fresh.retryDue();
        assertEquals(
                5,
                db.queryForObject(
                        "SELECT count(*) FROM webhook_delivery_logs WHERE delivery_status='DELIVERED'",
                        Integer.class));
        fresh.retryDue();
        assertEquals(
                7,
                db.queryForObject(
                        "SELECT count(*) FROM webhook_delivery_logs WHERE delivery_status='DELIVERED'",
                        Integer.class));
        var identity = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(transport, times(12))
                .post(anyString(), anyString(), anyString(), eq("TEST"), identity.capture());
        assertEquals(
                12,
                new HashSet<>(identity.getAllValues()).size(),
                "Oldest failures must back off instead of occupying the next batch");
        assertEquals(12, logs.count());
    }

    @Test
    void financialBatchOfFiftyAdvancesPastFailingOldestBacklog() {
        var owner =
                users.save(
                        new AppUser(
                                "backlog_owner",
                                "backlog@example.test",
                                "hash",
                                null,
                                UserStatus.ACTIVE));
        permissions.setUserPermission(owner.getId(), PermissionCode.USER_MANAGE, true, "fixture");
        var auth =
                org.springframework.security.authentication.UsernamePasswordAuthenticationToken
                        .authenticated(owner.getUsername(), "", List.of());
        hooks.createSubscription(
                "Fixture",
                "https://receiver.example.test/events",
                "fixture-secret",
                "INVOICE_ISSUED");
        for (int i = 0; i < 55; i++) {
            var invoice =
                    billing.createInvoice(
                            new CreateInvoiceRequest(
                                    owner.getId(),
                                    null,
                                    null,
                                    new java.math.BigDecimal("100"),
                                    "fixture"),
                            auth);
            String id = "INVOICE_ISSUED:" + invoice.id();
            db.update(
                    "UPDATE financial_outbox_events SET next_attempt_at=TIMESTAMP '2020-01-01' + (? * INTERVAL '1 second') WHERE id=?",
                    i,
                    id);
            if (i < 50)
                db.update(
                        "UPDATE financial_outbox_events SET payload='invalid-json-fixture' WHERE id=?",
                        id);
        }
        var fresh = new FinancialOutboxService(events, notifications, hooks, manager);
        ReflectionTestUtils.setField(fresh, "workerEnabled", true);
        fresh.retryDue();
        assertEquals(
                50,
                db.queryForObject(
                        "SELECT count(*) FROM financial_outbox_events WHERE attempts=1",
                        Integer.class));
        assertEquals(0, db.queryForObject("SELECT count(*) FROM notifications", Integer.class));
        fresh.retryDue();
        assertEquals(
                5,
                db.queryForObject(
                        "SELECT count(*) FROM financial_outbox_events WHERE status='LOCAL_COMPLETED'",
                        Integer.class));
        assertEquals(
                50,
                db.queryForObject(
                        "SELECT count(*) FROM financial_outbox_events WHERE status='PENDING' AND attempts=1 AND last_error='LOCAL_EVENT_PROCESSING_FAILED'",
                        Integer.class));
        assertEquals(5, db.queryForObject("SELECT count(*) FROM notifications", Integer.class));
        assertEquals(5, logs.count());
        assertEquals(55, invoices.count());
        assertEquals(55, events.count());
    }
}
