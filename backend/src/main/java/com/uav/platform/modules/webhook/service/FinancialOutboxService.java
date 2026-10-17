package com.uav.platform.modules.webhook.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.notification.dto.request.CreateNotificationRequest;
import com.uav.platform.modules.notification.enums.NotificationType;
import com.uav.platform.modules.notification.service.NotificationService;
import com.uav.platform.modules.webhook.entity.FinancialOutboxEvent;
import com.uav.platform.modules.webhook.repository.FinancialOutboxRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.*;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class FinancialOutboxService {
    private final FinancialOutboxRepository events;
    private final NotificationService notifications;
    private final WebhookEventQueue webhooks;
    private final TransactionTemplate transaction;
    private final ObjectMapper json = new ObjectMapper();

    @Value("${app.financial-outbox.worker-enabled:true}")
    private boolean workerEnabled;

    public FinancialOutboxService(
            FinancialOutboxRepository events,
            NotificationService notifications,
            WebhookEventQueue webhooks,
            PlatformTransactionManager manager) {
        this.events = events;
        this.notifications = notifications;
        this.webhooks = webhooks;
        transaction = new TransactionTemplate(manager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void recordInvoiceIssued(Invoice invoice) {
        record("INVOICE_ISSUED", invoice);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void recordPaymentCompleted(Invoice invoice) {
        record("PAYMENT_COMPLETED", invoice);
    }

    private void record(String type, Invoice invoice) {
        String id = type + ":" + invoice.getId();
        if (events.existsById(id)) return;
        try {
            String payload =
                    json.writeValueAsString(
                            Map.of(
                                    "invoiceId",
                                    invoice.getId(),
                                    "invoiceCode",
                                    invoice.getCode(),
                                    "amount",
                                    invoice.getAmount()));
            events.save(
                    new FinancialOutboxEvent(
                            id, type, invoice.getId(), invoice.getUser().getId(), payload));
        } catch (com.fasterxml.jackson.core.JsonProcessingException ex) {
            throw new IllegalStateException("FINANCIAL_EVENT_INVALID");
        }
    }

    @Scheduled(
            fixedDelayString = "${app.financial-outbox.retry-delay-ms:60000}",
            initialDelayString = "${app.financial-outbox.retry-delay-ms:60000}")
    public void retryDue() {
        if (workerEnabled)
            for (String id : events.dueIds(LocalDateTime.now(), PageRequest.of(0, 50))) process(id);
    }

    public void process(String id) {
        try {
            transaction.executeWithoutResult(
                    tx -> {
                        var event = events.findByIdForUpdate(id).orElse(null);
                        if (event == null || "LOCAL_COMPLETED".equals(event.getStatus())) return;
                        Map<String, Object> payload;
                        try {
                            payload =
                                    json.readValue(
                                            event.getPayload(),
                                            new TypeReference<Map<String, Object>>() {});
                        } catch (Exception ex) {
                            throw new IllegalStateException("FINANCIAL_EVENT_INVALID");
                        }
                        if (!event.isNotificationCreated())
                            notifications.sendNotification(
                                    new CreateNotificationRequest(
                                            event.getUserId(),
                                            event.getEventType().equals("INVOICE_ISSUED")
                                                    ? "Hóa đơn đã được phát hành"
                                                    : "Đã ghi nhận thanh toán",
                                            "Hóa đơn: " + payload.get("invoiceCode"),
                                            NotificationType.PAYMENT,
                                            "INVOICE",
                                            event.getInvoiceId()));
                        event.setNotificationCreated(true);
                        int targets =
                                webhooks.queueEvent(event.getId(), event.getEventType(), payload);
                        event.setStatus(targets > 0 ? "LOCAL_COMPLETED" : "WAITING_SUBSCRIBERS");
                        event.setNextAttemptAt(LocalDateTime.now().plusMinutes(1));
                        event.setAttempts(event.getAttempts() + 1);
                        event.setLastError(null);
                    });
        } catch (RuntimeException ex) {
            transaction.executeWithoutResult(
                    tx -> {
                        var event = events.findByIdForUpdate(id).orElse(null);
                        if (event == null || "LOCAL_COMPLETED".equals(event.getStatus())) return;
                        event.setAttempts(event.getAttempts() + 1);
                        event.setLastError("LOCAL_EVENT_PROCESSING_FAILED");
                        event.setNextAttemptAt(
                                LocalDateTime.now().plusMinutes(Math.min(60, event.getAttempts())));
                    });
        }
    }
}
