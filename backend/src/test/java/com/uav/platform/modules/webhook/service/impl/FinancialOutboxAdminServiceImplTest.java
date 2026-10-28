package com.uav.platform.modules.webhook.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.webhook.entity.FinancialOutboxEvent;
import com.uav.platform.modules.webhook.repository.FinancialOutboxRepository;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;

import java.time.LocalDateTime;
import java.util.Optional;

class FinancialOutboxAdminServiceImplTest {
    private final FinancialOutboxRepository repo = mock(FinancialOutboxRepository.class);
    private final AuditLogService audit = mock(AuditLogService.class);
    private final FinancialOutboxAdminServiceImpl service =
            new FinancialOutboxAdminServiceImpl(repo, audit);
    private final TestingAuthenticationToken admin = new TestingAuthenticationToken("ops", "x");

    private FinancialOutboxEvent event(String status, String lastError) {
        var e = new FinancialOutboxEvent("PAYMENT_COMPLETED:7", "PAYMENT_COMPLETED", 7L, 3L, "{}");
        e.setStatus(status);
        e.setLastError(lastError);
        e.setAttempts(4);
        e.setNextAttemptAt(LocalDateTime.now().plusMinutes(30));
        return e;
    }

    @Test
    void retryableStates() {
        assertTrue(FinancialOutboxAdminServiceImpl.retryable(event("FAILED", null)));
        assertTrue(FinancialOutboxAdminServiceImpl.retryable(event("WAITING_SUBSCRIBERS", null)));
        assertTrue(
                FinancialOutboxAdminServiceImpl.retryable(
                        event("PENDING", "LOCAL_EVENT_PROCESSING_FAILED")));
        assertFalse(FinancialOutboxAdminServiceImpl.retryable(event("PENDING", null)));
        assertFalse(FinancialOutboxAdminServiceImpl.retryable(event("LOCAL_COMPLETED", null)));
        assertFalse(FinancialOutboxAdminServiceImpl.retryable(event("SOMETHING_ELSE", null)));
    }

    @Test
    void retryMakesStuckEventDueNowAndAudits() {
        var e = event("PENDING", "LOCAL_EVENT_PROCESSING_FAILED");
        when(repo.findByIdForUpdate(e.getId())).thenReturn(Optional.of(e));
        var before = LocalDateTime.now();
        var res = service.retry(e.getId(), admin);
        assertEquals("PENDING", res.status());
        assertFalse(e.getNextAttemptAt().isAfter(LocalDateTime.now()));
        assertFalse(e.getNextAttemptAt().isBefore(before));
        assertEquals(4, e.getAttempts(), "attempt history is kept");
        assertFalse(e.isNotificationCreated(), "retry never fakes processing");
        verify(audit)
                .record(
                        isNull(),
                        eq("ops"),
                        any(),
                        eq("FINANCIAL_OUTBOX_EVENT"),
                        eq(e.getId()),
                        anyString());
    }

    @Test
    void failedEventIsResetToPending() {
        var e = event("FAILED", "X");
        when(repo.findByIdForUpdate(e.getId())).thenReturn(Optional.of(e));
        service.retry(e.getId(), admin);
        assertEquals("PENDING", e.getStatus());
    }

    @Test
    void completedEventCannotBeRetried() {
        var e = event("LOCAL_COMPLETED", null);
        var due = e.getNextAttemptAt();
        when(repo.findByIdForUpdate(e.getId())).thenReturn(Optional.of(e));
        var ex = assertThrows(SystemException.class, () -> service.retry(e.getId(), admin));
        assertEquals(409, ex.getStatus().value());
        assertEquals("LOCAL_COMPLETED", e.getStatus());
        assertEquals(due, e.getNextAttemptAt());
        verifyNoInteractions(audit);
    }

    @Test
    void missingEventIs404() {
        when(repo.findByIdForUpdate("nope")).thenReturn(Optional.empty());
        var ex = assertThrows(SystemException.class, () -> service.retry("nope", admin));
        assertEquals(404, ex.getStatus().value());
    }
}
