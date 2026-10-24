package com.uav.platform.modules.dashboard.service.impl;

import com.uav.platform.modules.billing.service.BankTransferService;
import com.uav.platform.modules.dashboard.dto.record.HealthCheckResult;
import com.uav.platform.modules.dashboard.dto.response.SystemHealthResponse;
import com.uav.platform.modules.dashboard.dto.response.SystemHealthResponse.Component;
import com.uav.platform.modules.dashboard.service.SystemHealthService;
import com.uav.platform.modules.media.service.ObjectStorageService;
import com.uav.platform.modules.webhook.entity.FinancialOutboxEvent;
import com.uav.platform.modules.webhook.entity.WebhookDeliveryLog;
import com.uav.platform.modules.webhook.repository.FinancialOutboxRepository;
import com.uav.platform.modules.webhook.repository.WebhookDeliveryLogRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.sql.Connection;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

import javax.sql.DataSource;

@Service
@RequiredArgsConstructor
public class SystemHealthServiceImpl implements SystemHealthService {
    /** Deliveries still queued this long after they were due are considered stuck. */
    static final Duration STUCK_AFTER = Duration.ofMinutes(5);

    static final int FAILED_DELIVERIES_WARN = 5;
    static final Duration OUTBOX_LAG_WARN = Duration.ofMinutes(10);

    private final DataSource dataSource;
    private final ObjectStorageService storage;
    private final WebhookDeliveryLogRepository deliveries;
    private final FinancialOutboxRepository outbox;
    private final BankTransferService bankTransfer;

    @Override
    public SystemHealthResponse check() {
        LocalDateTime now = LocalDateTime.now();
        List<Component> components =
                List.of(database(), storage(), webhooks(now), outbox(now), payments());
        return new SystemHealthResponse(overall(components), now, components, runtime());
    }

    /** Database down takes the platform down; any other problem only degrades it. */
    static String overall(List<Component> components) {
        boolean dbDown =
                components.stream()
                        .anyMatch(c -> c.key().equals("database") && c.status().equals("DOWN"));
        if (dbDown) return "DOWN";
        boolean degraded =
                components.stream()
                        .anyMatch(c -> !c.status().equals("UP") && !c.status().equals("UNKNOWN"));
        return degraded ? "DEGRADED" : "UP";
    }

    private Component database() {
        return timed(
                "database",
                () -> {
                    try (Connection connection = dataSource.getConnection()) {
                        boolean valid = connection.isValid(2);
                        var meta = connection.getMetaData();
                        Map<String, Object> details = new LinkedHashMap<>();
                        details.put("product", meta.getDatabaseProductName());
                        details.put("version", meta.getDatabaseProductVersion());
                        return new HealthCheckResult(valid ? "UP" : "DOWN", details);
                    }
                });
    }

    private Component storage() {
        return timed(
                "storage",
                () -> {
                    Map<String, Object> details = new LinkedHashMap<>();
                    details.put("provider", storage.provider());
                    try {
                        return new HealthCheckResult(
                                storage.bucketReachable() ? "UP" : "DOWN", details);
                    } catch (UnsupportedOperationException unsupported) {
                        return new HealthCheckResult("UNKNOWN", details);
                    }
                });
    }

    private Component webhooks(LocalDateTime now) {
        return timed(
                "webhooks",
                () -> {
                    long queued = deliveries.count(statusIn(List.of("QUEUED", "RETRYING")));
                    long stuck =
                            deliveries.count(
                                    statusIn(List.of("QUEUED", "RETRYING"))
                                            .and(
                                                    (r, q, cb) ->
                                                            cb.lessThan(
                                                                    r.get("nextAttemptAt"),
                                                                    now.minus(STUCK_AFTER))));
                    long failed24h =
                            deliveries.count(
                                    statusIn(List.of("FAILED"))
                                            .and(
                                                    (r, q, cb) ->
                                                            cb.greaterThan(
                                                                    r.get("attemptedAt"),
                                                                    now.minusHours(24))));
                    Map<String, Object> details = new LinkedHashMap<>();
                    details.put("queued", queued);
                    details.put("stuck", stuck);
                    details.put("failed24h", failed24h);
                    return new HealthCheckResult(
                            stuck > 0 || failed24h >= FAILED_DELIVERIES_WARN ? "DEGRADED" : "UP",
                            details);
                });
    }

    private Component outbox(LocalDateTime now) {
        return timed(
                "financialOutbox",
                () -> {
                    Specification<FinancialOutboxEvent> pending =
                            (r, q, cb) -> r.get("status").in("PENDING", "WAITING_SUBSCRIBERS");
                    long pendingCount = outbox.count(pending);
                    long lagging =
                            outbox.count(
                                    pending.and(
                                            (r, q, cb) ->
                                                    cb.lessThan(
                                                            r.get("createdAt"),
                                                            now.minus(OUTBOX_LAG_WARN))));
                    long failed = outbox.count((r, q, cb) -> cb.equal(r.get("status"), "FAILED"));
                    Map<String, Object> details = new LinkedHashMap<>();
                    details.put("pending", pendingCount);
                    details.put("lagging", lagging);
                    details.put("failed", failed);
                    return new HealthCheckResult(
                            lagging > 0 || failed > 0 ? "DEGRADED" : "UP", details);
                });
    }

    /** Bank transfer is optional; without a receiving account customers simply cannot pay by VietQR. */
    private Component payments() {
        return timed(
                "payments",
                () -> {
                    Map<String, Object> details = new LinkedHashMap<>();
                    var status = bankTransfer.status();
                    details.put("bankTransfer", status.enabled() ? "ENABLED" : "NOT_CONFIGURED");
                    if (status.bankName() != null && !status.bankName().isBlank())
                        details.put("bank", status.bankName());
                    return new HealthCheckResult(status.enabled() ? "UP" : "DEGRADED", details);
                });
    }

    private static Specification<WebhookDeliveryLog> statusIn(List<String> statuses) {
        return (r, q, cb) -> r.get("deliveryStatus").in(statuses);
    }

    private static SystemHealthResponse.Runtime runtime() {
        java.lang.Runtime rt = java.lang.Runtime.getRuntime();
        long mb = 1024 * 1024;
        double load = ManagementFactory.getOperatingSystemMXBean().getSystemLoadAverage();
        return new SystemHealthResponse.Runtime(
                ManagementFactory.getRuntimeMXBean().getUptime() / 1000,
                (rt.totalMemory() - rt.freeMemory()) / mb,
                rt.maxMemory() / mb,
                rt.availableProcessors(),
                Math.round(load * 100) / 100.0,
                System.getProperty("java.version"));
    }

    @FunctionalInterface
    private interface Check {
        HealthCheckResult run() throws Exception;
    }

    /** A check that throws is reported DOWN with the exception type only, so no connection details leak. */
    private static Component timed(String key, Check check) {
        long start = System.nanoTime();
        try {
            HealthCheckResult result = check.run();
            return new Component(
                    key,
                    result.status(),
                    (System.nanoTime() - start) / 1_000_000,
                    result.details());
        } catch (Exception failure) {
            return new Component(
                    key,
                    "DOWN",
                    (System.nanoTime() - start) / 1_000_000,
                    Map.of("error", failure.getClass().getSimpleName()));
        }
    }
}
