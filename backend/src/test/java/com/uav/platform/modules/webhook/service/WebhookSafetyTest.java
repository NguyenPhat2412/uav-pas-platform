package com.uav.platform.modules.webhook.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.webhook.entity.*;
import com.uav.platform.modules.webhook.repository.*;
import com.uav.platform.modules.webhook.service.impl.WebhookServiceImpl;

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
}
