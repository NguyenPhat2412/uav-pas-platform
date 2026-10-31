package com.uav.platform.service.impl.dashboard;

import com.uav.platform.dto.response.dashboard.AdminAnalyticsResponse;
import com.uav.platform.dto.response.dashboard.AdminAnalyticsResponse.*;
import com.uav.platform.entity.audit.AuditLog;
import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.entity.maintenance.MaintenanceSchedule;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.entity.webhook.WebhookDeliveryLog;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.repository.audit.AuditLogRepository;
import com.uav.platform.repository.billing.InvoiceRepository;
import com.uav.platform.repository.billing.UserQuotaRepository;
import com.uav.platform.repository.maintenance.MaintenanceScheduleRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.repository.webhook.WebhookDeliveryLogRepository;
import com.uav.platform.service.dashboard.AdminAnalyticsService;
import com.uav.platform.service.permission.PermissionService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Aggregates admin analytics in memory. Each section reads only the rows of its own window, which keeps the
 * queries simple at the platform's current scale; move a section to a grouped JPQL query if it grows.
 */
@Service
@RequiredArgsConstructor
public class AdminAnalyticsServiceImpl implements AdminAnalyticsService {
    private static final Set<MissionStatus> FAILED =
            EnumSet.of(MissionStatus.FAILED, MissionStatus.CANCELLED, MissionStatus.REJECTED);
    private static final int MAP_POINT_LIMIT = 500;

    private final MissionRepository missions;
    private final UavRepository uavs;
    private final UserRepository users;
    private final InvoiceRepository invoices;
    private final UserQuotaRepository quotas;
    private final MaintenanceScheduleRepository schedules;
    private final AuditLogRepository audit;
    private final WebhookDeliveryLogRepository webhookLogs;
    private final PermissionService permissions;

    @Override
    @Transactional(readOnly = true)
    public AdminAnalyticsResponse analytics(int days, Authentication authentication) {
        int span = Math.min(Math.max(days, 7), 366);
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(span - 1L);
        LocalDateTime start = from.atStartOfDay(), end = to.plusDays(1).atStartOfDay();
        LocalDateTime prevStart = start.minusDays(span);

        boolean missionsVisible = can(authentication, "MISSION_VIEW_ALL");
        boolean uavsVisible = can(authentication, "UAV_READ");
        boolean billingVisible = can(authentication, "PERMISSION_MANAGE");
        boolean usersVisible = can(authentication, "USER_READ");
        boolean auditVisible = can(authentication, "AUDIT_READ");
        boolean webhooksVisible = can(authentication, "USER_MANAGE");

        List<Mission> window =
                missionsVisible
                        ? missions.findAll(createdOrFinishedBetween(prevStart, end))
                        : List.of();
        List<Mission> current = window.stream().filter(finishedOrCreatedIn(start, end)).toList();
        List<Mission> previous =
                window.stream().filter(finishedOrCreatedIn(prevStart, start)).toList();
        List<Invoice> paid =
                billingVisible ? invoices.findAll(paidBetween(prevStart, end)) : List.of();

        Kpis currentKpis =
                kpis(
                        current,
                        paid,
                        start,
                        end,
                        usersVisible ? users.count(createdBetween(start, end)) : 0);
        Kpis previousKpis =
                kpis(
                        previous,
                        paid,
                        prevStart,
                        start,
                        usersVisible ? users.count(createdBetween(prevStart, start)) : 0);

        Map<String, Long> fleet = new LinkedHashMap<>();
        if (uavsVisible) {
            Map<UavStatus, Long> counts =
                    uavs.findAll().stream()
                            .collect(
                                    Collectors.groupingBy(
                                            Uav::getStatus,
                                            () -> new EnumMap<>(UavStatus.class),
                                            Collectors.counting()));
            for (UavStatus status : UavStatus.values())
                fleet.put(status.name(), counts.getOrDefault(status, 0L));
        }

        List<MaintenanceSchedule> activeSchedules =
                uavsVisible
                        ? schedules.findAll().stream()
                                .filter(MaintenanceSchedule::isActive)
                                .toList()
                        : List.of();
        List<WebhookDeliveryLog> deliveries =
                webhooksVisible ? webhookLogs.findAll(attemptedBetween(start, end)) : List.of();

        return new AdminAnalyticsResponse(
                from,
                to,
                currentKpis,
                previousKpis,
                daily(current, from, to),
                statusBreakdown(
                        missionsVisible
                                ? missions.findAll(createdBetweenMission(start, end))
                                : List.of()),
                flightHoursByStation(current),
                fleet,
                locations(current),
                billingVisible ? revenueByMonth() : List.of(),
                auditVisible
                        ? auditHeatmap(audit.findAll(auditBetween(start, end)))
                        : new long[7][24],
                webhookStats(deliveries),
                billingVisible ? quotaWarnings() : List.of(),
                alerts(
                        missionsVisible,
                        uavsVisible,
                        billingVisible,
                        fleet,
                        activeSchedules,
                        deliveries));
    }

    private Kpis kpis(
            List<Mission> list,
            List<Invoice> paid,
            LocalDateTime start,
            LocalDateTime end,
            long newUsers) {
        long completed =
                list.stream().filter(m -> m.getStatus() == MissionStatus.COMPLETED).count();
        long failed = list.stream().filter(m -> FAILED.contains(m.getStatus())).count();
        double hours =
                list.stream()
                        .filter(m -> m.getStatus() == MissionStatus.COMPLETED)
                        .mapToDouble(this::hours)
                        .sum();
        double rate =
                completed + failed == 0
                        ? 0
                        : Math.round(completed * 1000.0 / (completed + failed)) / 10.0;
        BigDecimal revenue =
                paid.stream()
                        .filter(i -> !i.getPaidAt().isBefore(start) && i.getPaidAt().isBefore(end))
                        .map(Invoice::getAmount)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Kpis(completed, failed, round(hours), rate, revenue, newUsers);
    }

    private List<DailyPoint> daily(List<Mission> list, LocalDate from, LocalDate to) {
        Map<LocalDate, long[]> byDay = new TreeMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) byDay.put(d, new long[2]);
        for (Mission m : list) {
            if (m.getStatus() == MissionStatus.COMPLETED && m.getCompletedAt() != null) {
                long[] slot = byDay.get(m.getCompletedAt().toLocalDate());
                if (slot != null) slot[0]++;
            } else if (FAILED.contains(m.getStatus())) {
                LocalDateTime at =
                        m.getCancelledAt() != null ? m.getCancelledAt() : m.getUpdatedAt();
                long[] slot = at == null ? null : byDay.get(at.toLocalDate());
                if (slot != null) slot[1]++;
            }
        }
        return byDay.entrySet().stream()
                .map(e -> new DailyPoint(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .toList();
    }

    private Map<String, Long> statusBreakdown(List<Mission> list) {
        Map<String, Long> result = new LinkedHashMap<>();
        for (MissionStatus status : MissionStatus.values()) result.put(status.name(), 0L);
        list.forEach(m -> result.merge(m.getStatus().name(), 1L, Long::sum));
        return result;
    }

    private List<NamedValue> flightHoursByStation(List<Mission> list) {
        return list.stream()
                .filter(m -> m.getStatus() == MissionStatus.COMPLETED)
                .collect(
                        Collectors.groupingBy(
                                m -> m.getStation() == null ? "—" : m.getStation().getName(),
                                Collectors.summingDouble(this::hours)))
                .entrySet()
                .stream()
                .map(e -> new NamedValue(e.getKey(), round(e.getValue())))
                .sorted(Comparator.comparingDouble(NamedValue::value).reversed())
                .toList();
    }

    private List<MissionPoint> locations(List<Mission> list) {
        return list.stream()
                .filter(m -> m.getLatitude() != null && m.getLongitude() != null)
                .limit(MAP_POINT_LIMIT)
                .map(
                        m ->
                                new MissionPoint(
                                        m.getCode(),
                                        m.getLatitude().doubleValue(),
                                        m.getLongitude().doubleValue(),
                                        m.getStatus().name()))
                .toList();
    }

    private List<MonthValue> revenueByMonth() {
        YearMonth first = YearMonth.now().minusMonths(5);
        Map<YearMonth, BigDecimal[]> months = new TreeMap<>();
        for (int i = 0; i < 6; i++)
            months.put(first.plusMonths(i), new BigDecimal[] {BigDecimal.ZERO, BigDecimal.ZERO});
        LocalDateTime since = first.atDay(1).atStartOfDay();
        for (Invoice invoice : invoices.findAll(createdOrPaidSince(since))) {
            BigDecimal amount = invoice.getAmount() == null ? BigDecimal.ZERO : invoice.getAmount();
            if (invoice.getStatus() == InvoiceStatus.PAID && invoice.getPaidAt() != null) {
                BigDecimal[] slot = months.get(YearMonth.from(invoice.getPaidAt()));
                if (slot != null) slot[0] = slot[0].add(amount);
            } else if (invoice.getStatus() == InvoiceStatus.PENDING
                    && invoice.getCreatedAt() != null) {
                BigDecimal[] slot = months.get(YearMonth.from(invoice.getCreatedAt()));
                if (slot != null) slot[1] = slot[1].add(amount);
            }
        }
        return months.entrySet().stream()
                .map(e -> new MonthValue(e.getKey().toString(), e.getValue()[0], e.getValue()[1]))
                .toList();
    }

    /** Rows are ISO weekdays Monday..Sunday, columns are hours 0..23. */
    static long[][] auditHeatmap(List<AuditLog> logs) {
        long[][] grid = new long[7][24];
        for (AuditLog log : logs) {
            if (log.getCreatedAt() == null) continue;
            grid[log.getCreatedAt().getDayOfWeek().getValue() - 1][log.getCreatedAt().getHour()]++;
        }
        return grid;
    }

    private List<WebhookStat> webhookStats(List<WebhookDeliveryLog> logs) {
        Map<String, long[]> byName = new TreeMap<>();
        for (WebhookDeliveryLog log : logs) {
            String name = log.getSubscription() == null ? "—" : log.getSubscription().getName();
            long[] slot = byName.computeIfAbsent(name, k -> new long[2]);
            slot[Boolean.TRUE.equals(log.getIsSuccess()) ? 0 : 1]++;
        }
        return byName.entrySet().stream()
                .map(e -> new WebhookStat(e.getKey(), e.getValue()[0], e.getValue()[1]))
                .toList();
    }

    private List<QuotaWarning> quotaWarnings() {
        return quotas.findAll().stream()
                .filter(
                        q ->
                                q.getFlightHoursLimit() != null
                                        && q.getFlightHoursLimit() > 0
                                        && q.getFlightHoursUsed() != null
                                        && q.getFlightHoursUsed() / q.getFlightHoursLimit() >= 0.8)
                .sorted(
                        Comparator.comparingDouble(
                                q -> -(q.getFlightHoursUsed() / q.getFlightHoursLimit())))
                .limit(10)
                .map(
                        q -> {
                            AppUser user = q.getUser();
                            return new QuotaWarning(
                                    user == null ? null : user.getId(),
                                    user == null ? "—" : user.getUsername(),
                                    round(q.getFlightHoursUsed()),
                                    round(q.getFlightHoursLimit()));
                        })
                .toList();
    }

    private List<Alert> alerts(
            boolean missionsVisible,
            boolean uavsVisible,
            boolean billingVisible,
            Map<String, Long> fleet,
            List<MaintenanceSchedule> activeSchedules,
            List<WebhookDeliveryLog> deliveries) {
        List<Alert> alerts = new ArrayList<>();
        LocalDate today = LocalDate.now();
        if (uavsVisible) {
            long total = fleet.values().stream().mapToLong(Long::longValue).sum();
            if (total > 0 && fleet.getOrDefault(UavStatus.AVAILABLE.name(), 0L) == 0)
                alerts.add(
                        new Alert(
                                "danger",
                                "NO_AVAILABLE_UAV",
                                "Không còn UAV sẵn sàng nhận nhiệm vụ",
                                "/operations/uavs",
                                0));
            long overdue =
                    activeSchedules.stream()
                            .filter(
                                    s ->
                                            s.getNextDueDate() != null
                                                    && s.getNextDueDate().isBefore(today))
                            .count();
            if (overdue > 0)
                alerts.add(
                        new Alert(
                                "danger",
                                "MAINTENANCE_OVERDUE",
                                overdue + " lịch bảo trì đã quá hạn",
                                "/operations/maintenance",
                                overdue));
            long dueSoon =
                    activeSchedules.stream()
                            .filter(
                                    s ->
                                            s.getNextDueDate() != null
                                                    && !s.getNextDueDate().isBefore(today)
                                                    && !s.getNextDueDate()
                                                            .isAfter(today.plusDays(7)))
                            .count();
            if (dueSoon > 0)
                alerts.add(
                        new Alert(
                                "warning",
                                "MAINTENANCE_DUE_SOON",
                                dueSoon + " UAV đến hạn bảo trì trong 7 ngày",
                                "/operations/maintenance",
                                dueSoon));
        }
        if (missionsVisible) {
            LocalDateTime cutoff = LocalDateTime.now().minusHours(24);
            long stale =
                    missions.count(
                            Specification.<Mission>where(
                                            (r, q, cb) ->
                                                    cb.equal(
                                                            r.get("status"),
                                                            MissionStatus.PENDING_CONFIRMATION))
                                    .and((r, q, cb) -> cb.lessThan(r.get("createdAt"), cutoff)));
            if (stale > 0)
                alerts.add(
                        new Alert(
                                "warning",
                                "PENDING_STALE",
                                stale + " yêu cầu chờ xác nhận quá 24 giờ",
                                "/operations/dispatch/missions",
                                stale));
        }
        if (billingVisible) {
            long overdueInvoices =
                    invoices.count(
                            Specification.<Invoice>where(
                                            (r, q, cb) ->
                                                    cb.equal(
                                                            r.get("status"), InvoiceStatus.PENDING))
                                    .and(
                                            (r, q, cb) ->
                                                    cb.lessThan(
                                                            r.get("dueDate"),
                                                            LocalDateTime.now())));
            if (overdueInvoices > 0)
                alerts.add(
                        new Alert(
                                "warning",
                                "INVOICE_OVERDUE",
                                overdueInvoices + " hóa đơn quá hạn thanh toán",
                                "/admin/billing",
                                overdueInvoices));
        }
        LocalDateTime dayAgo = LocalDateTime.now().minusHours(24);
        long recentFailures =
                deliveries.stream()
                        .filter(
                                d ->
                                        !Boolean.TRUE.equals(d.getIsSuccess())
                                                && d.getAttemptedAt() != null
                                                && d.getAttemptedAt().isAfter(dayAgo))
                        .count();
        if (recentFailures >= 3)
            alerts.add(
                    new Alert(
                            "warning",
                            "WEBHOOK_FAILURES",
                            recentFailures + " lần gửi webhook thất bại trong 24 giờ",
                            "/admin/webhooks",
                            recentFailures));
        return alerts;
    }

    private double hours(Mission m) {
        if (m.getStartTime() == null
                || m.getCompletedAt() == null
                || m.getCompletedAt().isBefore(m.getStartTime())) return 0;
        return Duration.between(m.getStartTime(), m.getCompletedAt()).toMinutes() / 60.0;
    }

    private static double round(double value) {
        return Math.round(value * 10) / 10.0;
    }

    private boolean can(Authentication authentication, String permission) {
        return permissions == null || permissions.has(authentication, permission);
    }

    private static Predicate<Mission> finishedOrCreatedIn(LocalDateTime start, LocalDateTime end) {
        return m -> {
            LocalDateTime at =
                    m.getCompletedAt() != null
                            ? m.getCompletedAt()
                            : m.getCancelledAt() != null
                                    ? m.getCancelledAt()
                                    : FAILED.contains(m.getStatus())
                                            ? m.getUpdatedAt()
                                            : m.getCreatedAt();
            return at != null && !at.isBefore(start) && at.isBefore(end);
        };
    }

    private static Specification<Mission> createdOrFinishedBetween(
            LocalDateTime start, LocalDateTime end) {
        return (r, q, cb) ->
                cb.or(
                        cb.and(
                                cb.greaterThanOrEqualTo(r.get("createdAt"), start),
                                cb.lessThan(r.get("createdAt"), end)),
                        cb.and(
                                cb.greaterThanOrEqualTo(r.get("updatedAt"), start),
                                cb.lessThan(r.get("updatedAt"), end)));
    }

    private static Specification<Mission> createdBetweenMission(
            LocalDateTime start, LocalDateTime end) {
        return (r, q, cb) ->
                cb.and(
                        cb.greaterThanOrEqualTo(r.get("createdAt"), start),
                        cb.lessThan(r.get("createdAt"), end));
    }

    private static Specification<AppUser> createdBetween(LocalDateTime start, LocalDateTime end) {
        return (r, q, cb) ->
                cb.and(
                        cb.greaterThanOrEqualTo(r.get("createdAt"), start),
                        cb.lessThan(r.get("createdAt"), end));
    }

    private static Specification<Invoice> paidBetween(LocalDateTime start, LocalDateTime end) {
        return (r, q, cb) ->
                cb.and(
                        cb.equal(r.get("status"), InvoiceStatus.PAID),
                        cb.greaterThanOrEqualTo(r.get("paidAt"), start),
                        cb.lessThan(r.get("paidAt"), end));
    }

    private static Specification<Invoice> createdOrPaidSince(LocalDateTime since) {
        return (r, q, cb) ->
                cb.or(
                        cb.greaterThanOrEqualTo(r.get("createdAt"), since),
                        cb.greaterThanOrEqualTo(r.get("paidAt"), since));
    }

    private static Specification<AuditLog> auditBetween(LocalDateTime start, LocalDateTime end) {
        return (r, q, cb) ->
                cb.and(
                        cb.greaterThanOrEqualTo(r.get("createdAt"), start),
                        cb.lessThan(r.get("createdAt"), end));
    }

    private static Specification<WebhookDeliveryLog> attemptedBetween(
            LocalDateTime start, LocalDateTime end) {
        return (r, q, cb) ->
                cb.and(
                        cb.greaterThanOrEqualTo(r.get("attemptedAt"), start),
                        cb.lessThan(r.get("attemptedAt"), end));
    }
}
