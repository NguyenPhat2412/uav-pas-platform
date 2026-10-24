package com.uav.platform.modules.dashboard.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.entity.UserQuota;
import com.uav.platform.modules.billing.enums.InvoiceStatus;
import com.uav.platform.modules.billing.repository.InvoiceRepository;
import com.uav.platform.modules.billing.repository.UserQuotaRepository;
import com.uav.platform.modules.dashboard.dto.response.CustomerAnalyticsResponse;
import com.uav.platform.modules.dashboard.dto.response.CustomerAnalyticsResponse.*;
import com.uav.platform.modules.dashboard.service.CustomerAnalyticsService;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.entity.MissionEvent;
import com.uav.platform.modules.mission.entity.MissionMedia;
import com.uav.platform.modules.mission.enums.MissionEventType;
import com.uav.platform.modules.mission.enums.MissionStatus;
import com.uav.platform.modules.mission.repository.MissionEventRepository;
import com.uav.platform.modules.mission.repository.MissionMediaRepository;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.specification.MissionSpecifications;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;

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
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/** Per-customer dashboard statistics. A customer has few missions, so aggregation happens in memory. */
@Service
@RequiredArgsConstructor
public class CustomerAnalyticsServiceImpl implements CustomerAnalyticsService {
    static final int MONTHS = 6;
    private static final Set<MissionStatus> STOPPED =
            EnumSet.of(MissionStatus.FAILED, MissionStatus.CANCELLED, MissionStatus.REJECTED);
    private static final Map<String, Set<MissionStatus>> PIPELINE = new LinkedHashMap<>();

    static {
        PIPELINE.put("waiting", EnumSet.of(MissionStatus.PENDING_CONFIRMATION));
        PIPELINE.put(
                "scheduled",
                EnumSet.of(
                        MissionStatus.CONFIRMED,
                        MissionStatus.RESOURCE_RESERVED,
                        MissionStatus.READY));
        PIPELINE.put("active", EnumSet.of(MissionStatus.IN_PROGRESS));
        PIPELINE.put("draft", EnumSet.of(MissionStatus.DRAFT));
    }

    private final UserRepository users;
    private final MissionRepository missions;
    private final MissionEventRepository events;
    private final MissionMediaRepository media;
    private final InvoiceRepository invoices;
    private final UserQuotaRepository quotas;

    @Override
    @Transactional(readOnly = true)
    public CustomerAnalyticsResponse analytics(Authentication authentication) {
        AppUser owner =
                users.findByUsername(authentication.getName())
                        .orElseThrow(() -> SystemException.notFound("User not found"));
        List<Mission> own = missions.findAll(MissionSpecifications.hasCustomer(owner.getId()));
        List<Invoice> bills = invoices.findByUserId(owner.getId());
        YearMonth now = YearMonth.now();

        return new CustomerAnalyticsResponse(
                kpis(own, bills, now),
                kpis(own, bills, now.minusMonths(1)),
                media.count(ownedMedia(owner.getId())),
                quotas.findByUserId(owner.getId()).map(q -> quota(q, LocalDate.now())).orElse(null),
                missionsByMonth(own, now),
                spendByMonth(bills, now),
                pendingInvoices(bills),
                pipeline(own),
                topServices(own),
                own.stream()
                        .filter(m -> m.getLatitude() != null && m.getLongitude() != null)
                        .map(
                                m ->
                                        new MissionPoint(
                                                m.getId(),
                                                m.getCode(),
                                                m.getLatitude().doubleValue(),
                                                m.getLongitude().doubleValue(),
                                                m.getStatus().name()))
                        .toList(),
                outcomes(own),
                turnaround(own),
                upcoming(own, LocalDateTime.now()));
    }

    private Kpis kpis(List<Mission> own, List<Invoice> bills, YearMonth month) {
        List<Mission> completed =
                own.stream()
                        .filter(
                                m ->
                                        m.getStatus() == MissionStatus.COMPLETED
                                                && m.getCompletedAt() != null
                                                && YearMonth.from(m.getCompletedAt()).equals(month))
                        .toList();
        BigDecimal spend =
                bills.stream()
                        .filter(
                                i ->
                                        i.getStatus() == InvoiceStatus.PAID
                                                && i.getPaidAt() != null
                                                && YearMonth.from(i.getPaidAt()).equals(month))
                        .map(this::amount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Kpis(
                completed.size(),
                round(completed.stream().mapToDouble(CustomerAnalyticsServiceImpl::hours).sum()),
                spend);
    }

    static Quota quota(UserQuota q, LocalDate today) {
        double used = q.getFlightHoursUsed() == null ? 0 : q.getFlightHoursUsed();
        double limit = q.getFlightHoursLimit() == null ? 0 : q.getFlightHoursLimit();
        LocalDate start = q.getCycleStart() == null ? null : q.getCycleStart().toLocalDate();
        LocalDate end = q.getCycleEnd() == null ? null : q.getCycleEnd().toLocalDate();
        long daysLeft = end == null ? 0 : Math.max(0, ChronoUnit.DAYS.between(today, end));
        Double projected = null;
        if (start != null && used > 0 && limit > used) {
            // Linear projection from the usage rate so far in this cycle.
            long elapsed = Math.max(1, ChronoUnit.DAYS.between(start, today));
            projected = round((limit - used) / (used / elapsed));
        } else if (limit > 0 && used >= limit) {
            projected = 0.0;
        }
        String plan = q.getPlan() == null ? null : q.getPlan().getName();
        return new Quota(plan, round(used), round(limit), start, end, daysLeft, projected);
    }

    private List<MonthMissions> missionsByMonth(List<Mission> own, YearMonth now) {
        Map<YearMonth, long[]> months = emptyMonths(now, () -> new long[2]);
        for (Mission m : own) {
            if (m.getStatus() == MissionStatus.COMPLETED && m.getCompletedAt() != null) {
                long[] slot = months.get(YearMonth.from(m.getCompletedAt()));
                if (slot != null) slot[0]++;
            } else if (STOPPED.contains(m.getStatus())) {
                LocalDateTime at =
                        m.getCancelledAt() != null ? m.getCancelledAt() : m.getUpdatedAt();
                long[] slot = at == null ? null : months.get(YearMonth.from(at));
                if (slot != null) slot[1]++;
            }
        }
        return months.entrySet().stream()
                .map(
                        e ->
                                new MonthMissions(
                                        e.getKey().toString(), e.getValue()[0], e.getValue()[1]))
                .toList();
    }

    private List<MonthSpend> spendByMonth(List<Invoice> bills, YearMonth now) {
        Map<YearMonth, BigDecimal[]> months =
                emptyMonths(now, () -> new BigDecimal[] {BigDecimal.ZERO, BigDecimal.ZERO});
        for (Invoice i : bills) {
            if (i.getStatus() == InvoiceStatus.PAID && i.getPaidAt() != null) {
                BigDecimal[] slot = months.get(YearMonth.from(i.getPaidAt()));
                if (slot != null) slot[0] = slot[0].add(amount(i));
            } else if (i.getStatus() == InvoiceStatus.PENDING && i.getCreatedAt() != null) {
                BigDecimal[] slot = months.get(YearMonth.from(i.getCreatedAt()));
                if (slot != null) slot[1] = slot[1].add(amount(i));
            }
        }
        return months.entrySet().stream()
                .map(e -> new MonthSpend(e.getKey().toString(), e.getValue()[0], e.getValue()[1]))
                .toList();
    }

    private PendingInvoices pendingInvoices(List<Invoice> bills) {
        List<Invoice> pending =
                bills.stream().filter(i -> i.getStatus() == InvoiceStatus.PENDING).toList();
        return new PendingInvoices(
                pending.size(),
                pending.stream().map(this::amount).reduce(BigDecimal.ZERO, BigDecimal::add),
                pending.stream()
                        .map(Invoice::getDueDate)
                        .filter(Objects::nonNull)
                        .min(Comparator.naturalOrder())
                        .orElse(null));
    }

    private Map<String, Long> pipeline(List<Mission> own) {
        Map<String, Long> result = new LinkedHashMap<>();
        PIPELINE.forEach(
                (key, states) ->
                        result.put(
                                key,
                                own.stream().filter(m -> states.contains(m.getStatus())).count()));
        return result;
    }

    private List<ServiceUsage> topServices(List<Mission> own) {
        return own.stream()
                .filter(m -> m.getService() != null && m.getStatus() != MissionStatus.DRAFT)
                .collect(
                        Collectors.groupingBy(m -> m.getService().getName(), Collectors.counting()))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> new ServiceUsage(e.getKey(), e.getValue()))
                .toList();
    }

    static Outcomes outcomes(List<Mission> own) {
        long completed = count(own, MissionStatus.COMPLETED),
                failed = count(own, MissionStatus.FAILED);
        long cancelled = count(own, MissionStatus.CANCELLED),
                rejected = count(own, MissionStatus.REJECTED);
        long finished = completed + failed + cancelled + rejected;
        List<Reason> reasons =
                own.stream()
                        .filter(m -> STOPPED.contains(m.getStatus()))
                        .collect(
                                Collectors.groupingBy(
                                        m ->
                                                m.getFailureReason() == null
                                                                || m.getFailureReason().isBlank()
                                                        ? m.getStatus().name()
                                                        : m.getFailureReason(),
                                        Collectors.counting()))
                        .entrySet()
                        .stream()
                        .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                        .limit(5)
                        .map(e -> new Reason(e.getKey(), e.getValue()))
                        .toList();
        return new Outcomes(
                completed,
                failed,
                cancelled,
                rejected,
                finished == 0 ? 0 : Math.round(completed * 1000.0 / finished) / 10.0,
                reasons);
    }

    private Turnaround turnaround(List<Mission> own) {
        List<Long> ids =
                own.stream()
                        .filter(m -> m.getStatus() != MissionStatus.DRAFT)
                        .map(Mission::getId)
                        .toList();
        if (ids.isEmpty()) return new Turnaround(null, null, 0);
        Map<Long, List<MissionEvent>> byMission =
                events
                        .findAll(
                                (Specification<MissionEvent>)
                                        (r, q, cb) -> r.get("mission").get("id").in(ids))
                        .stream()
                        .collect(Collectors.groupingBy(e -> e.getMission().getId()));
        return turnaround(byMission);
    }

    /** Submission is the first SUBMITTED event; confirmation is the first change to CONFIRMED. */
    static Turnaround turnaround(Map<Long, List<MissionEvent>> byMission) {
        List<Double> confirm = new ArrayList<>(), complete = new ArrayList<>();
        for (List<MissionEvent> list : byMission.values()) {
            LocalDateTime submitted =
                    first(list, e -> e.getEventType() == MissionEventType.SUBMITTED);
            if (submitted == null) continue;
            LocalDateTime confirmed = first(list, e -> e.getNewStatus() == MissionStatus.CONFIRMED);
            LocalDateTime completedAt =
                    first(
                            list,
                            e ->
                                    e.getEventType() == MissionEventType.COMPLETED
                                            || e.getNewStatus() == MissionStatus.COMPLETED);
            if (confirmed != null && !confirmed.isBefore(submitted))
                confirm.add(Duration.between(submitted, confirmed).toMinutes() / 60.0);
            if (completedAt != null && !completedAt.isBefore(submitted))
                complete.add(Duration.between(submitted, completedAt).toMinutes() / 60.0);
        }
        return new Turnaround(
                average(confirm), average(complete), Math.max(confirm.size(), complete.size()));
    }

    private List<Upcoming> upcoming(List<Mission> own, LocalDateTime now) {
        Set<MissionStatus> scheduled =
                EnumSet.of(
                        MissionStatus.PENDING_CONFIRMATION,
                        MissionStatus.CONFIRMED,
                        MissionStatus.RESOURCE_RESERVED,
                        MissionStatus.READY,
                        MissionStatus.IN_PROGRESS);
        return own.stream()
                .filter(
                        m ->
                                scheduled.contains(m.getStatus())
                                        && m.getStartTime() != null
                                        && !m.getStartTime().isBefore(now.minusHours(12))
                                        && m.getStartTime().isBefore(now.plusDays(7)))
                .sorted(Comparator.comparing(Mission::getStartTime))
                .limit(8)
                .map(
                        m ->
                                new Upcoming(
                                        m.getId(),
                                        m.getCode(),
                                        m.getTitle(),
                                        m.getStartTime(),
                                        m.getStatus().name(),
                                        m.getLocationName()))
                .toList();
    }

    private static Specification<MissionMedia> ownedMedia(Long customerId) {
        return (r, q, cb) ->
                cb.and(
                        cb.equal(r.get("mission").get("customer").get("id"), customerId),
                        cb.isTrue(r.get("media").get("confirmed")),
                        cb.isFalse(r.get("media").get("deleted")));
    }

    private static <T> Map<YearMonth, T> emptyMonths(
            YearMonth now, java.util.function.Supplier<T> empty) {
        Map<YearMonth, T> months = new TreeMap<>();
        for (int i = MONTHS - 1; i >= 0; i--) months.put(now.minusMonths(i), empty.get());
        return months;
    }

    private static LocalDateTime first(
            List<MissionEvent> list, java.util.function.Predicate<MissionEvent> match) {
        return list.stream()
                .filter(match)
                .map(MissionEvent::getCreatedAt)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElse(null);
    }

    private static Double average(List<Double> values) {
        return values.isEmpty()
                ? null
                : round(values.stream().mapToDouble(Double::doubleValue).average().orElse(0));
    }

    private static long count(List<Mission> own, MissionStatus status) {
        return own.stream().filter(m -> m.getStatus() == status).count();
    }

    private static double hours(Mission m) {
        if (m.getStartTime() == null
                || m.getCompletedAt() == null
                || m.getCompletedAt().isBefore(m.getStartTime())) return 0;
        return Duration.between(m.getStartTime(), m.getCompletedAt()).toMinutes() / 60.0;
    }

    private BigDecimal amount(Invoice invoice) {
        return invoice.getAmount() == null ? BigDecimal.ZERO : invoice.getAmount();
    }

    private static double round(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
