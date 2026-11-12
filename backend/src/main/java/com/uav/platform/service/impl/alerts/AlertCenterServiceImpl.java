package com.uav.platform.service.impl.alerts;

import com.uav.platform.dto.response.alerts.AdminAlertResponse;
import com.uav.platform.dto.response.alerts.AlertCenterResponse;
import com.uav.platform.dto.response.dashboard.SystemHealthResponse;
import com.uav.platform.dto.response.weather.WeatherAssessmentResponse;
import com.uav.platform.entity.devicekey.DeviceApiKey;
import com.uav.platform.enums.alerts.AlertSeverity;
import com.uav.platform.enums.alerts.AlertSource;
import com.uav.platform.enums.weather.FlightClearanceLevel;
import com.uav.platform.repository.devicekey.DeviceApiKeyRepository;
import com.uav.platform.service.alerts.AlertCenterService;
import com.uav.platform.service.dashboard.SystemHealthService;
import com.uav.platform.service.settings.SystemConfigService;
import com.uav.platform.service.weather.WeatherService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Read-only alert aggregation. Every source is queried independently, so one failing source shows
 * up as its own alert instead of hiding the others.
 */
@Slf4j
@Service
public class AlertCenterServiceImpl implements AlertCenterService {
    static final String KEY_PREFIX = "adminPlatform.alerts.messages.";
    static final Duration TELEMETRY_STALE = Duration.ofMinutes(10);

    /** A low battery reading older than this is not current for a UAV that is not flying. */
    static final Duration BATTERY_RELEVANT = Duration.ofMinutes(30);

    static final Duration OUTBOX_LAG = Duration.ofMinutes(15);
    static final Duration WEBHOOK_STUCK = Duration.ofMinutes(30);
    static final Duration KEY_EXPIRY_WINDOW = Duration.ofDays(7);
    static final int MAX_ITEMS = 200;
    private static final ZoneId OPERATIONS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final JdbcTemplate db;
    private final SystemConfigService settings;
    private final DeviceApiKeyRepository deviceKeys;
    private final ObjectProvider<SystemHealthService> health;
    private final ObjectProvider<WeatherService> weather;

    /** Missions starting within this window are checked against the forecast. */
    static final Duration WEATHER_LOOKAHEAD = Duration.ofHours(6);

    static final int WEATHER_MISSION_LIMIT = 5;

    public AlertCenterServiceImpl(
            JdbcTemplate db,
            SystemConfigService settings,
            DeviceApiKeyRepository deviceKeys,
            ObjectProvider<SystemHealthService> health) {
        this(db, settings, deviceKeys, health, null);
    }

    @Autowired
    public AlertCenterServiceImpl(
            JdbcTemplate db,
            SystemConfigService settings,
            DeviceApiKeyRepository deviceKeys,
            ObjectProvider<SystemHealthService> health,
            ObjectProvider<WeatherService> weather) {
        this.db = db;
        this.settings = settings;
        this.deviceKeys = deviceKeys;
        this.health = health;
        this.weather = weather;
    }

    /** Not transactional on purpose: a failing source query must not poison the others. */
    @Override
    public AlertCenterResponse current() {
        LocalDateTime now = LocalDateTime.now();
        List<AdminAlertResponse> items = new ArrayList<>();
        collect(items, AlertSource.FLEET, () -> fleet(items, now));
        collect(items, AlertSource.MAINTENANCE, () -> maintenance(items));
        collect(items, AlertSource.WEBHOOK, () -> webhooks(items, now));
        collect(items, AlertSource.FINANCE, () -> outbox(items, now));
        collect(items, AlertSource.BILLING, () -> invoices(items, now));
        collect(items, AlertSource.SECURITY, () -> expiringKeys(items, now));
        collect(items, AlertSource.SYSTEM, () -> systemHealth(items));
        List<AdminAlertResponse> sorted =
                items.stream()
                        .sorted(
                                Comparator.comparing(
                                                (AdminAlertResponse a) ->
                                                        AlertSeverity.valueOf(a.severity()))
                                        .thenComparing(
                                                AdminAlertResponse::since,
                                                Comparator.nullsLast(Comparator.naturalOrder())))
                        .limit(MAX_ITEMS)
                        .toList();
        return new AlertCenterResponse(
                now,
                count(items, AlertSeverity.CRITICAL),
                count(items, AlertSeverity.WARNING),
                count(items, AlertSeverity.INFO),
                sorted);
    }

    private void collect(List<AdminAlertResponse> items, AlertSource source, Runnable query) {
        try {
            query.run();
        } catch (RuntimeException ex) {
            log.warn("Alert source {} unavailable: {}", source, ex.getClass().getSimpleName());
            items.add(
                    alert(
                            "source-" + source,
                            "ALERT_SOURCE_UNAVAILABLE",
                            AlertSeverity.INFO,
                            source,
                            Map.of("source", source.name()),
                            "/admin/system-health",
                            null));
        }
    }

    private void fleet(List<AdminAlertResponse> items, LocalDateTime now) {
        try {
            weatherHazards(items, now);
        } catch (RuntimeException ex) {
            // Weather is advisory here; battery and telemetry alerts must still be reported.
            log.warn("Mission weather check unavailable: {}", ex.getClass().getSimpleName());
        }
        int threshold = batteryThreshold();
        Map<Long, Object[]> latest = new HashMap<>();
        db.query(
                "SELECT t.uav_id, t.battery_pct, t.recorded_at FROM uav_telemetry t"
                        + " WHERE t.recorded_at = (SELECT MAX(t2.recorded_at) FROM uav_telemetry t2"
                        + " WHERE t2.uav_id = t.uav_id)",
                rs -> {
                    int pct = rs.getInt("battery_pct");
                    Integer battery = rs.wasNull() ? null : pct;
                    latest.put(
                            rs.getLong("uav_id"),
                            new Object[] {
                                battery, rs.getTimestamp("recorded_at").toLocalDateTime()
                            });
                });
        db.query(
                "SELECT id, serial_number, status FROM uavs WHERE status <> 'INACTIVE' ORDER BY id",
                rs -> {
                    long id = rs.getLong("id");
                    String serial = rs.getString("serial_number");
                    boolean flying = "IN_USE".equals(rs.getString("status"));
                    Object[] sample = latest.get(id);
                    Integer battery = sample == null ? null : (Integer) sample[0];
                    LocalDateTime recordedAt = sample == null ? null : (LocalDateTime) sample[1];
                    String href = "/admin/uavs?uav=" + id;
                    if (battery != null
                            && battery < threshold
                            && (flying || recordedAt.isAfter(now.minus(BATTERY_RELEVANT)))) {
                        Map<String, Object> params = new LinkedHashMap<>();
                        params.put("serial", serial);
                        params.put("battery", battery);
                        params.put("threshold", threshold);
                        items.add(
                                alert(
                                        "uav-battery-" + id,
                                        "UAV_BATTERY_LOW",
                                        flying ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
                                        AlertSource.FLEET,
                                        params,
                                        href,
                                        recordedAt));
                    }
                    if (flying
                            && (recordedAt == null
                                    || recordedAt.isBefore(now.minus(TELEMETRY_STALE)))) {
                        Map<String, Object> params = new LinkedHashMap<>();
                        params.put("serial", serial);
                        params.put(
                                "minutes",
                                recordedAt == null
                                        ? null
                                        : Duration.between(recordedAt, now).toMinutes());
                        items.add(
                                alert(
                                        "uav-telemetry-" + id,
                                        recordedAt == null
                                                ? "UAV_TELEMETRY_MISSING"
                                                : "UAV_TELEMETRY_STALE",
                                        recordedAt == null
                                                ? AlertSeverity.WARNING
                                                : AlertSeverity.CRITICAL,
                                        AlertSource.FLEET,
                                        params,
                                        href,
                                        recordedAt));
                    }
                });
    }

    /** Confirmed missions starting in the next 6 hours whose site is forecast NO_GO. */
    private void weatherHazards(List<AdminAlertResponse> items, LocalDateTime now) {
        WeatherService service = weather == null ? null : weather.getIfAvailable();
        if (service == null) return;
        db.query(
                "SELECT m.id, m.code, m.latitude, m.longitude, m.start_time, s.max_wind_ms"
                        + " FROM missions m LEFT JOIN uav_services s ON s.id = m.service_id"
                        + " WHERE m.status IN ('CONFIRMED', 'RESOURCE_RESERVED', 'READY')"
                        + " AND m.latitude IS NOT NULL AND m.longitude IS NOT NULL"
                        + " AND m.start_time >= ? AND m.start_time <= ?"
                        + " ORDER BY m.start_time LIMIT "
                        + WEATHER_MISSION_LIMIT,
                rs -> {
                    long id = rs.getLong("id");
                    LocalDateTime start = rs.getTimestamp("start_time").toLocalDateTime();
                    double serviceWind = rs.getDouble("max_wind_ms");
                    Double serviceMaxWind = rs.wasNull() ? null : serviceWind;
                    WeatherAssessmentResponse assessment =
                            service.assess(
                                    rs.getDouble("latitude"),
                                    rs.getDouble("longitude"),
                                    start,
                                    serviceMaxWind);
                    if (assessment.clearance() != FlightClearanceLevel.NO_GO) return;
                    Map<String, Object> params = new LinkedHashMap<>();
                    params.put("code", rs.getString("code"));
                    params.put("reasons", String.join(", ", assessment.reasonCodes()));
                    params.put("wind", assessment.windSpeed80mMs());
                    items.add(
                            alert(
                                    "mission-weather-" + id,
                                    "MISSION_WEATHER_HAZARD",
                                    AlertSeverity.WARNING,
                                    AlertSource.FLEET,
                                    params,
                                    "/operations/missions/" + id,
                                    start));
                },
                Timestamp.valueOf(now),
                Timestamp.valueOf(now.plus(WEATHER_LOOKAHEAD)));
    }

    private int batteryThreshold() {
        try {
            int value =
                    Integer.parseInt(
                            settings.valueOrDefault("uav.safety.min_battery_threshold", "25")
                                    .trim());
            return value > 0 && value < 100 ? value : 25;
        } catch (RuntimeException ex) {
            return 25;
        }
    }

    private void maintenance(List<AdminAlertResponse> items) {
        LocalDate today = LocalDate.now(OPERATIONS_ZONE);
        db.query(
                "SELECT s.id, s.uav_id, s.title, s.next_due_date, u.serial_number"
                        + " FROM maintenance_schedules s JOIN uavs u ON u.id = s.uav_id"
                        + " WHERE s.active = TRUE AND s.next_due_date < ?"
                        + " ORDER BY s.next_due_date LIMIT 50",
                rs -> {
                    LocalDate due = rs.getDate("next_due_date").toLocalDate();
                    long days = ChronoUnit.DAYS.between(due, today);
                    Map<String, Object> params = new LinkedHashMap<>();
                    params.put("serial", rs.getString("serial_number"));
                    params.put("title", rs.getString("title"));
                    params.put("days", days);
                    items.add(
                            alert(
                                    "maintenance-" + rs.getLong("id"),
                                    "MAINTENANCE_OVERDUE",
                                    days > 7 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
                                    AlertSource.MAINTENANCE,
                                    params,
                                    "/admin/uavs?uav=" + rs.getLong("uav_id"),
                                    due.atStartOfDay()));
                },
                java.sql.Date.valueOf(today));
    }

    private void webhooks(List<AdminAlertResponse> items, LocalDateTime now) {
        Object[] failed =
                db.queryForObject(
                        "SELECT COUNT(*), MIN(attempted_at) FROM webhook_delivery_logs"
                                + " WHERE delivery_status = 'FAILED' AND attempted_at >= ?",
                        (rs, i) -> new Object[] {rs.getLong(1), rs.getTimestamp(2)},
                        Timestamp.valueOf(now.minusHours(24)));
        if (failed != null && (long) failed[0] > 0)
            items.add(
                    alert(
                            "webhook-failed",
                            "WEBHOOK_DELIVERIES_FAILED",
                            AlertSeverity.WARNING,
                            AlertSource.WEBHOOK,
                            Map.of("count", failed[0]),
                            "/admin/webhooks",
                            toLocal(failed[1])));
        Object[] stuck =
                db.queryForObject(
                        "SELECT COUNT(*), MIN(next_attempt_at) FROM webhook_delivery_logs"
                                + " WHERE delivery_status IN ('QUEUED', 'RETRYING')"
                                + " AND next_attempt_at < ?",
                        (rs, i) -> new Object[] {rs.getLong(1), rs.getTimestamp(2)},
                        Timestamp.valueOf(now.minus(WEBHOOK_STUCK)));
        if (stuck != null && (long) stuck[0] > 0)
            items.add(
                    alert(
                            "webhook-stuck",
                            "WEBHOOK_DELIVERIES_STUCK",
                            AlertSeverity.WARNING,
                            AlertSource.WEBHOOK,
                            Map.of("count", stuck[0]),
                            "/admin/webhooks",
                            toLocal(stuck[1])));
    }

    private void outbox(List<AdminAlertResponse> items, LocalDateTime now) {
        Object[] failing =
                db.queryForObject(
                        "SELECT COUNT(*), MIN(created_at), MAX(attempts) FROM financial_outbox_events"
                                + " WHERE status <> 'LOCAL_COMPLETED' AND last_error IS NOT NULL",
                        (rs, i) -> new Object[] {rs.getLong(1), rs.getTimestamp(2), rs.getInt(3)},
                        new Object[0]);
        if (failing != null && (long) failing[0] > 0)
            items.add(
                    alert(
                            "outbox-failed",
                            "FINANCIAL_OUTBOX_FAILED",
                            (int) failing[2] >= 5 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
                            AlertSource.FINANCE,
                            Map.of("count", failing[0]),
                            "/admin/billing/outbox",
                            toLocal(failing[1])));
        Object[] lagging =
                db.queryForObject(
                        "SELECT COUNT(*), MIN(created_at) FROM financial_outbox_events"
                                + " WHERE status = 'PENDING' AND last_error IS NULL AND created_at < ?",
                        (rs, i) -> new Object[] {rs.getLong(1), rs.getTimestamp(2)},
                        Timestamp.valueOf(now.minus(OUTBOX_LAG)));
        if (lagging != null && (long) lagging[0] > 0)
            items.add(
                    alert(
                            "outbox-lagging",
                            "FINANCIAL_OUTBOX_LAGGING",
                            AlertSeverity.WARNING,
                            AlertSource.FINANCE,
                            Map.of("count", lagging[0], "minutes", OUTBOX_LAG.toMinutes()),
                            "/admin/billing/outbox",
                            toLocal(lagging[1])));
    }

    private void invoices(List<AdminAlertResponse> items, LocalDateTime now) {
        Object[] overdue =
                db.queryForObject(
                        "SELECT COUNT(*), MIN(due_date) FROM invoices"
                                + " WHERE status = 'PENDING' AND due_date < ?",
                        (rs, i) -> new Object[] {rs.getLong(1), rs.getTimestamp(2)},
                        Timestamp.valueOf(now));
        if (overdue != null && (long) overdue[0] > 0) {
            LocalDateTime oldest = toLocal(overdue[1]);
            long days = oldest == null ? 0 : Duration.between(oldest, now).toDays();
            items.add(
                    alert(
                            "invoices-overdue",
                            "INVOICES_OVERDUE",
                            days > 30 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
                            AlertSource.BILLING,
                            Map.of("count", overdue[0], "days", days),
                            "/admin/billing/invoices",
                            oldest));
        }
    }

    private void expiringKeys(List<AdminAlertResponse> items, LocalDateTime now) {
        for (DeviceApiKey key : deviceKeys.findExpiringBetween(now, now.plus(KEY_EXPIRY_WINDOW))) {
            long hours = Duration.between(now, key.getExpiresAt()).toHours();
            Map<String, Object> params = new LinkedHashMap<>();
            params.put("name", key.getName());
            params.put("days", hours / 24);
            params.put("hours", hours);
            items.add(
                    alert(
                            "device-key-" + key.getId(),
                            "DEVICE_KEY_EXPIRING",
                            hours < 24 ? AlertSeverity.WARNING : AlertSeverity.INFO,
                            AlertSource.SECURITY,
                            params,
                            "/admin/device-keys",
                            key.getExpiresAt()));
        }
    }

    private void systemHealth(List<AdminAlertResponse> items) {
        SystemHealthService service = health.getIfAvailable();
        if (service == null) return;
        SystemHealthResponse snapshot = service.check();
        if (snapshot == null || snapshot.components() == null) return;
        for (SystemHealthResponse.Component component : snapshot.components()) {
            String status = String.valueOf(component.status());
            if ("UP".equals(status)) continue;
            AlertSeverity severity =
                    switch (status) {
                        case "DOWN" -> AlertSeverity.CRITICAL;
                        case "DEGRADED" -> AlertSeverity.WARNING;
                        default -> AlertSeverity.INFO;
                    };
            String code =
                    switch (status) {
                        case "DOWN" -> "HEALTH_COMPONENT_DOWN";
                        case "DEGRADED" -> "HEALTH_COMPONENT_DEGRADED";
                        default -> "HEALTH_COMPONENT_UNKNOWN";
                    };
            items.add(
                    alert(
                            "health-" + component.key(),
                            code,
                            severity,
                            AlertSource.SYSTEM,
                            Map.of("component", component.key(), "status", status),
                            "/admin/system-health",
                            snapshot.checkedAt()));
        }
    }

    private static LocalDateTime toLocal(Object timestamp) {
        return timestamp instanceof Timestamp t ? t.toLocalDateTime() : null;
    }

    private static int count(List<AdminAlertResponse> items, AlertSeverity severity) {
        return (int) items.stream().filter(a -> severity.name().equals(a.severity())).count();
    }

    private static AdminAlertResponse alert(
            String id,
            String code,
            AlertSeverity severity,
            AlertSource source,
            Map<String, Object> params,
            String href,
            LocalDateTime since) {
        Map<String, Object> safe = new LinkedHashMap<>();
        params.forEach(
                (k, v) -> {
                    if (v != null) safe.put(k, v);
                });
        return new AdminAlertResponse(
                id, code, severity.name(), source.name(), KEY_PREFIX + code, safe, href, since);
    }
}
