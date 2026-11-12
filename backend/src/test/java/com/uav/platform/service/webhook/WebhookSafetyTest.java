package com.uav.platform.service.webhook;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.entity.webhook.*;
import com.uav.platform.repository.webhook.*;
import com.uav.platform.service.impl.webhook.WebhookServiceImpl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.*;

class WebhookSafetyTest {
    @ParameterizedTest
    @ValueSource(
            strings = {
                "http://[fc00::1]/",
                "http://[fd12::1]/",
                "http://100.64.0.1/",
                "https://user:password@example.com/",
                "https://example.com/#fragment",
                "http://192.0.2.1/"
            })
    void rejectsNonPublicOrAmbiguousTargets(String url) {
        assertThrows(RuntimeException.class, () -> WebhookServiceImpl.validateSafeWebhookUrl(url));
    }

    @Test
    void unconfiguredDoesNotFakeGovernmentSuccess() {
        var subs = mock(WebhookSubscriptionRepository.class);
        var logs = mock(WebhookDeliveryLogRepository.class);
        when(subs.findActiveSubscribersForEvent("TEST"))
                .thenReturn(
                        List.of(
                                new WebhookSubscription(
                                        "fixture",
                                        "https://example.invalid/?gov.vn",
                                        "test-only-secret",
                                        "TEST")));
        var service = new WebhookServiceImpl(subs, logs, null);
        service.broadcastEvent("TEST", Map.of());
        var cap = org.mockito.ArgumentCaptor.forClass(WebhookDeliveryLog.class);
        verify(logs).save(cap.capture());
        assertFalse(cap.getValue().getIsSuccess());
        assertNotEquals(200, cap.getValue().getResponseStatusCode());
    }

    @Test
    void outcomeReflectsActualMatchingAndApprovedTargets() {
        var subs = mock(WebhookSubscriptionRepository.class);
        var logs = mock(WebhookDeliveryLogRepository.class);
        var service = new WebhookServiceImpl(subs, logs, null);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "enabled", true);
        org.springframework.test.util.ReflectionTestUtils.setField(
                service, "approvedUrls", "https://approved.example.test/events");
        when(subs.findActiveSubscribersForEvent("TEST")).thenReturn(List.of());
        assertEquals("UNCONFIGURED", service.dispatchEvent("TEST", Map.of()));
        verifyNoInteractions(logs);
        var sub =
                new WebhookSubscription(
                        "Fixture", "https://other.example.test/events", "fixture-secret", "TEST");
        sub.setId(1L);
        when(subs.findActiveSubscribersForEvent("TEST")).thenReturn(List.of(sub));
        assertEquals("UNCONFIGURED", service.dispatchEvent("TEST", Map.of()));
        var cap = org.mockito.ArgumentCaptor.forClass(WebhookDeliveryLog.class);
        verify(logs).save(cap.capture());
        assertEquals("UNCONFIGURED", cap.getValue().getDeliveryStatus());
        sub.setTargetUrl("https://approved.example.test/events");
        assertEquals("QUEUED", service.dispatchEvent("TEST", Map.of()));
    }

    @Test
    void signingHeadersCarryTimestampAndPreviousSecretDuringGrace() {
        var service =
                new WebhookServiceImpl(
                        mock(WebhookSubscriptionRepository.class),
                        mock(WebhookDeliveryLogRepository.class),
                        null);
        var sub =
                new WebhookSubscription(
                        "Fixture",
                        "https://receiver.example.test/events",
                        "new-secret-0123456789abcdef0123456789",
                        "TEST");
        var now = java.time.LocalDateTime.of(2026, 10, 28, 12, 0);
        var headers = service.signatureHeaders(sub, "{}", 1_700_000_000L, now);
        assertEquals(
                service.calculateHmacSha256("{}", sub.getSecretKey()),
                headers.get("X-Signature-SHA256"));
        assertEquals("1700000000", headers.get("X-Webhook-Timestamp"));
        assertEquals(
                "t=1700000000,v1="
                        + service.calculateHmacSha256("1700000000.{}", sub.getSecretKey()),
                headers.get("X-Webhook-Signature"));
        assertFalse(headers.containsKey("X-Signature-SHA256-Previous"));

        sub.setPreviousSecretKey("old-secret-0123456789abcdef0123456789");
        sub.setPreviousSecretExpiresAt(now.plusHours(1));
        headers = service.signatureHeaders(sub, "{}", 1_700_000_000L, now);
        assertTrue(
                headers.get("X-Webhook-Signature")
                        .endsWith(
                                ",v1="
                                        + service.calculateHmacSha256(
                                                "1700000000.{}",
                                                "old-secret-0123456789abcdef0123456789")));
        assertEquals(
                service.calculateHmacSha256("{}", "old-secret-0123456789abcdef0123456789"),
                headers.get("X-Signature-SHA256-Previous"));

        headers = service.signatureHeaders(sub, "{}", 1_700_000_000L, now.plusHours(2));
        assertFalse(headers.containsKey("X-Signature-SHA256-Previous"), "grace period over");
    }

    @Test
    void shortSecretsAreRejectedOnCreate() {
        var subs = mock(WebhookSubscriptionRepository.class);
        var service = new WebhookServiceImpl(subs, mock(WebhookDeliveryLogRepository.class), null);
        var error =
                assertThrows(
                        com.uav.platform.error.SystemException.class,
                        () ->
                                service.createSubscription(
                                        "Fixture",
                                        "https://receiver.example.test/events",
                                        "short-secret",
                                        "TEST"));
        assertEquals("WEBHOOK_SECRET_TOO_SHORT", error.getCode());
        verify(subs, never()).save(any());
    }

    @Test
    void enablingAnApprovedDestinationReleasesParkedDeliveries() {
        var subs = mock(WebhookSubscriptionRepository.class);
        var logs = mock(WebhookDeliveryLogRepository.class);
        var service = new WebhookServiceImpl(subs, logs, null);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "enabled", true);
        org.springframework.test.util.ReflectionTestUtils.setField(
                service, "approvedUrls", "https://approved.example.test/events");
        var sub =
                new WebhookSubscription(
                        "Fixture",
                        "https://approved.example.test/events",
                        "fixture-secret-0123456789abcdef0123456789",
                        "TEST");
        sub.setId(3L);
        sub.setIsActive(false);
        when(subs.findByIdForUpdate(3L)).thenReturn(java.util.Optional.of(sub));
        service.toggleSubscription(3L, true);
        verify(logs).requeueUnconfigured(eq(3L), any());
    }
}
