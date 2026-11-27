package com.uav.platform.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uav.platform.dao.IFinancialOutboxDao;
import com.uav.platform.dto.request.CreateNotificationRequest;
import com.uav.platform.entity.FinancialOutboxEvent;
import com.uav.platform.entity.Invoice;
import com.uav.platform.enums.NotificationType;
import com.uav.platform.service.FinancialOutboxService;
import com.uav.platform.service.InvoiceMailService;
import com.uav.platform.service.NotificationService;
import com.uav.platform.service.WebhookEventQueue;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.*;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@Slf4j
public class FinancialOutboxServiceImpl implements FinancialOutboxService {
    /** After this many failed local attempts the event is FAILED and waits for an admin retry. */
    static final int MAX_ATTEMPTS = 8;

    private final IFinancialOutboxDao events;
    private final NotificationService notifications;
    private final WebhookEventQueue webhooks;
    private final TransactionTemplate transaction;
    private final ObjectMapper json = new ObjectMapper();

    @Value("${app.financial-outbox.worker-enabled:true}")
    private boolean workerEnabled;

    @Value("${app.financial-outbox.async-after-commit:true}")
    private boolean asyncAfterCommit;

    private final java.util.concurrent.ExecutorService afterCommitExecutor =
            java.util.concurrent.Executors.newFixedThreadPool(
                    2,
                    r -> {
                        Thread t = new Thread(r, "financial-outbox-after-commit");
                        t.setDaemon(true);
                        return t;
                    });

    @Autowired(required = false)
    private InvoiceMailService invoiceMailService;

    public FinancialOutboxServiceImpl(
            IFinancialOutboxDao events,
            NotificationService notifications,
            WebhookEventQueue webhooks,
            PlatformTransactionManager manager) {
        this.events = events;
        this.notifications = notifications;
        this.webhooks = webhooks;
        transaction = new TransactionTemplate(manager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void setInvoiceMailService(InvoiceMailService invoiceMailService) {
        this.invoiceMailService = invoiceMailService;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordInvoiceIssued(Invoice invoice) {
        record("INVOICE_ISSUED", invoice);
        if (invoice != null && invoice.getId() != null) {
            scheduleAfterCommit("INVOICE_ISSUED:" + invoice.getId());
        }
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordPaymentCompleted(Invoice invoice) {
        record("PAYMENT_COMPLETED", invoice);
        if (invoice != null && invoice.getId() != null) {
            scheduleAfterCommit("PAYMENT_COMPLETED:" + invoice.getId());
        }
    }

    @jakarta.annotation.PreDestroy
    void shutdownAfterCommitExecutor() {
        afterCommitExecutor.shutdown();
    }

    private void scheduleAfterCommit(String eventId) {
        if (workerEnabled
                && eventId != null
                && TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            process(eventId);
                        }
                    });
        }
    }

    @Override
    public boolean handlesPaymentNotification() {
        return true;
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

    @Override
    @Scheduled(
            fixedDelayString = "${app.financial-outbox.retry-delay-ms:60000}",
            initialDelayString = "${app.financial-outbox.retry-delay-ms:60000}")
    public void retryDue() {
        if (workerEnabled)
            for (String id : events.dueIds(LocalDateTime.now(), PageRequest.of(0, 50))) process(id);
    }

    @Override
    public void process(String id) {
        Long[] mailTargetInvoiceId = {null};
        String[] mailTargetEventType = {null};
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
                        webhooks.queueEvent(event.getId(), event.getEventType(), payload);
                        // Local work (notification + delivery rows for current subscribers) is done
                        // either way. With no subscriber there is nothing to wait for: re-polling
                        // forever would only grow the due queue. Destinations added later receive
                        // new events only; there is no historical backfill.
                        event.setStatus("LOCAL_COMPLETED");
                        event.setNextAttemptAt(LocalDateTime.now().plusMinutes(1));
                        event.setAttempts(event.getAttempts() + 1);
                        event.setLastError(null);
                        mailTargetInvoiceId[0] = event.getInvoiceId();
                        mailTargetEventType[0] = event.getEventType();
                    });
        } catch (RuntimeException ex) {
            transaction.executeWithoutResult(
                    tx -> {
                        var event = events.findByIdForUpdate(id).orElse(null);
                        if (event == null || "LOCAL_COMPLETED".equals(event.getStatus())) return;
                        event.setAttempts(event.getAttempts() + 1);
                        event.setLastError("LOCAL_EVENT_PROCESSING_FAILED");
                        // Stop the worker retrying forever; admins can requeue a FAILED event.
                        if (event.getAttempts() >= MAX_ATTEMPTS) event.setStatus("FAILED");
                        event.setNextAttemptAt(
                                LocalDateTime.now().plusMinutes(Math.min(60, event.getAttempts())));
                    });
            return;
        }

        if (invoiceMailService != null
                && mailTargetInvoiceId[0] != null
                && mailTargetEventType[0] != null) {
            final Long targetInvId = mailTargetInvoiceId[0];
            final String targetType = mailTargetEventType[0];
            Runnable sendTask =
                    () -> {
                        try {
                            invoiceMailService.sendForOutboxEvent(targetInvId, targetType);
                        } catch (RuntimeException ex) {
                            log.warn(
                                    "Best-effort invoice email dispatch failed for invoiceId={}, eventType={}: {}",
                                    targetInvId,
                                    targetType,
                                    ex.getMessage());
                        }
                    };
            if (asyncAfterCommit) {
                afterCommitExecutor.execute(sendTask);
            } else {
                sendTask.run();
            }
        }
    }
}
