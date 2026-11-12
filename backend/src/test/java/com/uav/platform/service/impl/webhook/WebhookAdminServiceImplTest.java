package com.uav.platform.service.impl.webhook;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.entity.webhook.WebhookDeliveryLog;
import com.uav.platform.entity.webhook.WebhookSubscription;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.webhook.WebhookMapper;
import com.uav.platform.repository.webhook.WebhookDeliveryLogRepository;
import com.uav.platform.repository.webhook.WebhookSubscriptionRepository;
import com.uav.platform.service.audit.AuditLogService;

import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.TestingAuthenticationToken;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

class WebhookAdminServiceImplTest {
    private final WebhookSubscriptionRepository subs = mock(WebhookSubscriptionRepository.class);
    private final WebhookDeliveryLogRepository logs = mock(WebhookDeliveryLogRepository.class);
    private final AuditLogService audit = mock(AuditLogService.class);
    private final WebhookMapper mapper = Mappers.getMapper(WebhookMapper.class);
    private final WebhookAdminServiceImpl service =
            new WebhookAdminServiceImpl(subs, logs, mapper, audit);
    private final TestingAuthenticationToken admin = new TestingAuthenticationToken("ops", "x");

    private WebhookSubscription sub() {
        var s =
                new WebhookSubscription(
                        "Dest", "https://example.test/hook", "old-secret-1234", "X");
        s.setId(5L);
        return s;
    }

    private WebhookDeliveryLog delivery(WebhookSubscription s, String status) {
        var d = new WebhookDeliveryLog(s, "X", "{}", 500, "HTTP_REJECTED", 12, false);
        d.setId(9L);
        d.setDeliveryStatus(status);
        d.setRetryCount(3);
        d.setNextAttemptAt(LocalDateTime.now().plusMinutes(3));
        return d;
    }

    private void stub(WebhookSubscription s, WebhookDeliveryLog d) {
        when(logs.subscriptionIdForDelivery(9L)).thenReturn(Optional.of(5L));
        when(subs.findByIdForUpdate(5L)).thenReturn(Optional.ofNullable(s));
        when(logs.findByIdForUpdate(9L)).thenReturn(Optional.of(d));
    }

    @Test
    void failedDeliveryIsRequeuedWithFreshAttemptBudget() {
        var s = sub();
        var d = delivery(s, "FAILED");
        stub(s, d);
        var res = service.retryDelivery(9L, admin);
        assertEquals("QUEUED", res.deliveryStatus());
        assertEquals(0, d.getRetryCount());
        assertFalse(d.getNextAttemptAt().isAfter(LocalDateTime.now()));
        verify(audit)
                .record(isNull(), eq("ops"), any(), eq("WEBHOOK_DELIVERY"), eq("9"), anyString());
    }

    @Test
    void nonFailedDeliveriesAreRejected() {
        for (String status :
                List.of(
                        "QUEUED",
                        "RETRYING",
                        "DELIVERED",
                        "CANCELLED",
                        "LEGACY_UNVERIFIED",
                        "UNCONFIGURED")) {
            var s = sub();
            var d = delivery(s, status);
            stub(s, d);
            var ex = assertThrows(SystemException.class, () -> service.retryDelivery(9L, admin));
            assertEquals(409, ex.getStatus().value(), status);
            assertEquals(status, d.getDeliveryStatus());
            assertEquals(3, d.getRetryCount());
        }
        verifyNoInteractions(audit);
    }

    @Test
    void removedOrInactiveDestinationsAreRejected() {
        var removed = sub();
        removed.setDeletedAt(LocalDateTime.now());
        stub(removed, delivery(removed, "FAILED"));
        assertEquals(
                "WEBHOOK_SUBSCRIPTION_REMOVED",
                assertThrows(SystemException.class, () -> service.retryDelivery(9L, admin))
                        .getCode());

        var inactive = sub();
        inactive.setIsActive(false);
        stub(inactive, delivery(inactive, "FAILED"));
        assertEquals(
                "WEBHOOK_SUBSCRIPTION_INACTIVE",
                assertThrows(SystemException.class, () -> service.retryDelivery(9L, admin))
                        .getCode());
    }

    @Test
    void unknownDeliveryIs404() {
        when(logs.subscriptionIdForDelivery(1L)).thenReturn(Optional.empty());
        assertEquals(
                404,
                assertThrows(SystemException.class, () -> service.retryDelivery(1L, admin))
                        .getStatus()
                        .value());
    }

    @Test
    void rotatedSecretIsStrongReturnedOnceAndNeverInListsOrAudit() {
        var s = sub();
        when(subs.findByIdForUpdate(5L)).thenReturn(Optional.of(s));
        when(subs.save(any())).thenAnswer(i -> i.getArgument(0));

        var rotated = service.rotateSecret(5L, admin);
        String secret = rotated.secretKey();
        assertTrue(secret.startsWith("whsec_"));
        assertTrue(secret.length() >= 40 && secret.length() <= 120);
        assertEquals(secret, s.getSecretKey());
        assertNotEquals(secret, rotated.maskedSecret());
        assertFalse(rotated.maskedSecret().contains(secret.substring(0, secret.length() - 4)));

        // Regular list responses keep the mask.
        when(subs.findAll()).thenReturn(List.of(s));
        var list = new WebhookServiceImpl(subs, logs, null, mapper).listSubscriptions();
        assertEquals(1, list.size());
        assertNotEquals(secret, list.get(0).secretKey());
        assertTrue(list.get(0).secretKey().startsWith("********"));
        assertFalse(list.get(0).toString().contains(secret));

        var details = ArgumentCaptor.forClass(String.class);
        verify(audit)
                .record(
                        isNull(),
                        eq("ops"),
                        any(),
                        eq("WEBHOOK_SUBSCRIPTION"),
                        eq("5"),
                        details.capture());
        assertFalse(details.getValue().contains(secret));
        assertFalse(details.getValue().contains(secret.substring(secret.length() - 4)));
    }

    @Test
    void generatedSecretsAreUnique() {
        var seen = new HashSet<String>();
        for (int i = 0; i < 200; i++)
            assertTrue(seen.add(WebhookAdminServiceImpl.generateSecret()));
    }

    @Test
    void cannotRotateRemovedSubscription() {
        var s = sub();
        s.setDeletedAt(LocalDateTime.now());
        when(subs.findByIdForUpdate(5L)).thenReturn(Optional.of(s));
        assertThrows(SystemException.class, () -> service.rotateSecret(5L, admin));
        assertEquals("old-secret-1234", s.getSecretKey());
        verify(subs, never()).save(any());
    }
}
