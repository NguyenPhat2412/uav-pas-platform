package com.uav.platform.service.impl.dashboard;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.response.dashboard.SystemHealthResponse;
import com.uav.platform.dto.response.dashboard.SystemHealthResponse.Component;
import com.uav.platform.repository.webhook.FinancialOutboxRepository;
import com.uav.platform.repository.webhook.WebhookDeliveryLogRepository;
import com.uav.platform.service.media.ObjectStorageService;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

class SystemHealthServiceTest {

    private Component c(String key, String status) {
        return new Component(key, status, 1L, Map.of());
    }

    @Test
    void databaseDownMeansDownOtherProblemsOnlyDegrade() {
        assertEquals(
                "DOWN",
                SystemHealthServiceImpl.overall(
                        List.of(c("database", "DOWN"), c("storage", "UP"))));
        assertEquals(
                "DEGRADED",
                SystemHealthServiceImpl.overall(
                        List.of(c("database", "UP"), c("storage", "DOWN"))));
        assertEquals(
                "UP",
                SystemHealthServiceImpl.overall(
                        List.of(c("database", "UP"), c("storage", "UNKNOWN"))));
    }

    @Test
    @SuppressWarnings("unchecked")
    void failingChecksAreReportedWithoutLeakingDetails() throws SQLException {
        DataSource dataSource = mock(DataSource.class);
        when(dataSource.getConnection())
                .thenThrow(new SQLException("jdbc:postgresql://secret-host:5432 refused"));
        ObjectStorageService storage = mock(ObjectStorageService.class);
        when(storage.provider()).thenReturn("minio");
        when(storage.bucketReachable()).thenReturn(true);
        WebhookDeliveryLogRepository deliveries = mock(WebhookDeliveryLogRepository.class);
        when(deliveries.count(any(Specification.class))).thenReturn(0L);
        FinancialOutboxRepository outbox = mock(FinancialOutboxRepository.class);
        when(outbox.count(any(Specification.class))).thenReturn(0L);
        com.uav.platform.service.billing.BankTransferService bank =
                mock(com.uav.platform.service.billing.BankTransferService.class);
        when(bank.status())
                .thenReturn(
                        new com.uav.platform.dto.response.billing.BankTransferStatusResponse(
                                false, null));

        com.uav.platform.service.infrastructure.MailDiagnosticsService mail =
                mock(com.uav.platform.service.infrastructure.MailDiagnosticsService.class);
        when(mail.connection())
                .thenReturn(
                        new com.uav.platform.dto.record.infrastructure.MailConnectionCheck(
                                "DISABLED", java.time.Instant.now(), null));
        com.uav.platform.service.infrastructure.BackupStatusService backups =
                mock(com.uav.platform.service.infrastructure.BackupStatusService.class);
        when(backups.status())
                .thenThrow(new IllegalStateException("/opt/uav-pas/backups unreadable"));
        com.uav.platform.service.infrastructure.TlsCertificateService tls =
                mock(com.uav.platform.service.infrastructure.TlsCertificateService.class);
        when(tls.current())
                .thenReturn(
                        new com.uav.platform.dto.record.infrastructure.TlsCertificateInfo(
                                "EXPIRING",
                                java.time.Instant.now().plusSeconds(86_400 * 5),
                                5L,
                                "R3",
                                true,
                                java.time.Instant.now(),
                                null));

        SystemHealthResponse health =
                new SystemHealthServiceImpl(
                                dataSource, storage, deliveries, outbox, bank, mail, backups, tls)
                        .check();

        assertEquals("DOWN", health.status());
        Component db = health.components().get(0);
        assertEquals(Map.of("error", "SQLException"), db.details());
        assertFalse(db.details().toString().contains("secret-host"));
        assertEquals("UP", health.components().get(1).status());

        Map<String, Component> byKey = new java.util.HashMap<>();
        health.components().forEach(c -> byKey.put(c.key(), c));
        assertEquals("DISABLED", byKey.get("mail").status());
        assertEquals("DOWN", byKey.get("backups").status());
        assertEquals(Map.of("error", "IllegalStateException"), byKey.get("backups").details());
        assertEquals("DEGRADED", byKey.get("tls").status());
        assertEquals(5L, byKey.get("tls").details().get("daysLeft"));
        assertFalse(health.toString().contains("/opt/uav-pas"));
    }

    @Test
    void disabledMailDoesNotDegradeOverall() {
        assertEquals(
                "UP",
                SystemHealthServiceImpl.overall(
                        List.of(c("database", "UP"), c("mail", "DISABLED"))));
    }

    @Test
    void backupAndTlsStatesMapToHealth() {
        assertEquals("UP", SystemHealthServiceImpl.backupHealth("OK"));
        assertEquals("DEGRADED", SystemHealthServiceImpl.backupHealth("STALE"));
        assertEquals("DEGRADED", SystemHealthServiceImpl.backupHealth("MISSING"));
        assertEquals("UNKNOWN", SystemHealthServiceImpl.backupHealth("NOT_CONFIGURED"));
        var now = java.time.Instant.now();
        assertEquals(
                "DOWN",
                SystemHealthServiceImpl.tlsHealth(
                        new com.uav.platform.dto.record.infrastructure.TlsCertificateInfo(
                                "EXPIRED", now, -1L, "R3", false, now, null)));
        assertEquals(
                "UNKNOWN",
                SystemHealthServiceImpl.tlsHealth(
                        new com.uav.platform.dto.record.infrastructure.TlsCertificateInfo(
                                "NOT_HTTPS", null, null, null, null, now, null)));
    }
}
