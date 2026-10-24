package com.uav.platform.modules.dashboard.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.dashboard.dto.response.SystemHealthResponse;
import com.uav.platform.modules.dashboard.dto.response.SystemHealthResponse.Component;
import com.uav.platform.modules.media.service.ObjectStorageService;
import com.uav.platform.modules.webhook.repository.FinancialOutboxRepository;
import com.uav.platform.modules.webhook.repository.WebhookDeliveryLogRepository;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
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
        assertEquals("DOWN", SystemHealthServiceImpl.overall(List.of(c("database", "DOWN"), c("storage", "UP"))));
        assertEquals("DEGRADED", SystemHealthServiceImpl.overall(List.of(c("database", "UP"), c("storage", "DOWN"))));
        assertEquals("UP", SystemHealthServiceImpl.overall(List.of(c("database", "UP"), c("storage", "UNKNOWN"))));
    }

    @Test
    @SuppressWarnings("unchecked")
    void failingChecksAreReportedWithoutLeakingDetails() throws SQLException {
        DataSource dataSource = mock(DataSource.class);
        when(dataSource.getConnection()).thenThrow(new SQLException("jdbc:postgresql://secret-host:5432 refused"));
        ObjectStorageService storage = mock(ObjectStorageService.class);
        when(storage.provider()).thenReturn("minio");
        when(storage.bucketReachable()).thenReturn(true);
        WebhookDeliveryLogRepository deliveries = mock(WebhookDeliveryLogRepository.class);
        when(deliveries.count(any(Specification.class))).thenReturn(0L);
        FinancialOutboxRepository outbox = mock(FinancialOutboxRepository.class);
        when(outbox.count(any(Specification.class))).thenReturn(0L);
        com.uav.platform.modules.billing.service.BankTransferService bank = mock(com.uav.platform.modules.billing.service.BankTransferService.class);
        when(bank.status()).thenReturn(new com.uav.platform.modules.billing.dto.response.BankTransferStatusResponse(false, null));

        SystemHealthResponse health = new SystemHealthServiceImpl(dataSource, storage, deliveries, outbox, bank).check();

        assertEquals("DOWN", health.status());
        Component db = health.components().get(0);
        assertEquals(Map.of("error", "SQLException"), db.details());
        assertFalse(db.details().toString().contains("secret-host"));
        assertEquals("UP", health.components().get(1).status());
    }
}
