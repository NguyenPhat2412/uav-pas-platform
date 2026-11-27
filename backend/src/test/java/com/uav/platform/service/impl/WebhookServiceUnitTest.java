package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dao.IWebhookDeliveryLogDao;
import com.uav.platform.dao.IWebhookSubscriptionDao;
import com.uav.platform.dto.request.WebhookSubscriptionRequest;
import com.uav.platform.dto.request.WebhookTestDispatchRequest;
import com.uav.platform.entity.WebhookDeliveryLog;
import com.uav.platform.entity.WebhookSubscription;
import com.uav.platform.error.SystemException;
import com.uav.platform.transport.WebhookTransport;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

class WebhookServiceUnitTest {

    @Test
    void subscriptionCrudDispatchRetryAndSignatureRotationWork() throws Exception {
        IWebhookSubscriptionDao subDao = mock(IWebhookSubscriptionDao.class);
        IWebhookDeliveryLogDao logDao = mock(IWebhookDeliveryLogDao.class);
        WebhookTransport transport = mock(WebhookTransport.class);
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());

        WebhookServiceImpl service = new WebhookServiceImpl(subDao, logDao, new ObjectMapper());
        ReflectionTestUtils.setField(service, "enabled", true);
        ReflectionTestUtils.setField(service, "approvedUrls", "https://hooks.example.com/uav");
        ReflectionTestUtils.setField(service, "transport", transport);
        ReflectionTestUtils.setField(service, "transactionManager", tm);

        String validSecret = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6";
        WebhookSubscription sub =
                new WebhookSubscription(
                        "ERP",
                        "https://hooks.example.com/uav",
                        validSecret,
                        "SAR_EMERGENCY_TRIGGERED");
        sub.setId(1L);
        sub.setPreviousSecretKey("z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4");
        sub.setPreviousSecretExpiresAt(LocalDateTime.now().plusHours(2));

        // Short secret rejected
        assertThrows(
                SystemException.class,
                () ->
                        service.createSubscription(
                                new WebhookSubscriptionRequest(
                                        "Bad", "https://hooks.example.com/uav", "short", "EVT")));

        // Valid create, list, status
        when(subDao.save(any(WebhookSubscription.class))).thenReturn(sub);
        assertNotNull(
                service.createSubscription(
                        new WebhookSubscriptionRequest(
                                "ERP",
                                "https://hooks.example.com/uav",
                                validSecret,
                                "SAR_EMERGENCY_TRIGGERED")));

        when(subDao.findAll()).thenReturn(List.of(sub));
        assertEquals("QUEUED", service.dispatchStatus());
        assertEquals(1, service.listSubscriptions().size());

        // Toggle & requeueApprovedDestinations
        when(subDao.findByIdForUpdate(1L)).thenReturn(Optional.of(sub));
        service.toggleSubscription(1L, true);
        verify(logDao).requeueUnconfigured(eq(1L), any());

        when(subDao.findByIsActiveTrue()).thenReturn(List.of(sub));
        service.requeueApprovedDestinations();
        verify(logDao, times(2)).requeueUnconfigured(eq(1L), any());

        // Dispatch test & queueEvent
        when(subDao.findActiveSubscribersForEvent("SAR_EMERGENCY_TRIGGERED"))
                .thenReturn(List.of(sub));
        when(logDao.existsByEventIdAndSubscriptionId(any(), eq(1L))).thenReturn(false);
        var res =
                service.dispatchTest(
                        new WebhookTestDispatchRequest(
                                Map.of("eventType", "SAR_EMERGENCY_TRIGGERED")));
        assertEquals("QUEUED", res.status());
        assertEquals(1, service.queueEvent("evt-1", "SAR_EMERGENCY_TRIGGERED", Map.of("k", "v")));
        service.broadcastEvent("SAR_EMERGENCY_TRIGGERED", Map.of("k", "v"));

        // Signature headers with active grace rotation
        Map<String, String> headers =
                service.signatureHeaders(sub, "{\"ok\":true}", 1700000000L, LocalDateTime.now());
        assertTrue(headers.containsKey("X-Signature-SHA256-Previous"));
        assertTrue(headers.get("X-Webhook-Signature").contains(",v1="));

        // processDelivery: 200 -> DELIVERED
        WebhookDeliveryLog logEntry =
                WebhookDeliveryLogOperations.create(
                        sub, "SAR_EMERGENCY_TRIGGERED", "{}", null, null, 0, false);
        logEntry.setEventId("evt-1");
        logEntry.setDeliveryStatus("QUEUED");
        logEntry.setNextAttemptAt(LocalDateTime.now().minusMinutes(1));
        when(logDao.subscriptionIdForDelivery(10L)).thenReturn(Optional.of(1L));
        when(logDao.findByIdForUpdate(10L)).thenReturn(Optional.of(logEntry));
        when(transport.post(any(), any(), anyMap(), any(), any())).thenReturn(200);
        service.processDelivery(10L);
        assertEquals("DELIVERED", logEntry.getDeliveryStatus());

        // processDelivery: 302 redirect blocked + transport exception -> RETRYING -> FAILED
        WebhookDeliveryLog retryEntry =
                WebhookDeliveryLogOperations.create(
                        sub, "SAR_EMERGENCY_TRIGGERED", "{}", null, null, 0, false);
        retryEntry.setDeliveryStatus("QUEUED");
        retryEntry.setNextAttemptAt(LocalDateTime.now().minusMinutes(1));
        when(logDao.subscriptionIdForDelivery(11L)).thenReturn(Optional.of(1L));
        when(logDao.findByIdForUpdate(11L)).thenReturn(Optional.of(retryEntry));
        when(transport.post(any(), any(), anyMap(), any(), any())).thenReturn(302);
        service.processDelivery(11L);
        assertEquals("RETRYING", retryEntry.getDeliveryStatus());
        assertEquals("REDIRECT_BLOCKED", retryEntry.getResponseBody());

        retryEntry.setRetryCount(2);
        retryEntry.setNextAttemptAt(LocalDateTime.now().minusMinutes(1));
        when(transport.post(any(), any(), anyMap(), any(), any()))
                .thenThrow(new RuntimeException("net"));
        service.processDelivery(11L);
        assertEquals("FAILED", retryEntry.getDeliveryStatus());

        // retryDue & listDeliveryLogs & deleteSubscription
        when(logDao.dueIds(any(), any())).thenReturn(List.of(10L));
        service.retryDue();
        when(logDao.findAllByOrderByAttemptedAtDesc(any()))
                .thenReturn(new PageImpl<>(List.of(logEntry)));
        Page<?> page = service.listDeliveryLogs(PageRequest.of(0, 10));
        assertEquals(1, page.getTotalElements());

        service.deleteSubscription(1L);
        assertNotNull(sub.getDeletedAt());
        verify(logDao).cancelPendingForSubscription(1L);
    }
}
