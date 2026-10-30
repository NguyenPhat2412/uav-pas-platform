package com.uav.platform.modules.billing.service.impl;

import com.uav.platform.modules.billing.dto.response.PlanStatsResponse;
import com.uav.platform.modules.billing.dto.response.PlanStatsResponse.InvoiceBucket;
import com.uav.platform.modules.billing.dto.response.PlanStatsResponse.MonthRow;
import com.uav.platform.modules.billing.dto.response.PlanStatsResponse.NearLimitCustomer;
import com.uav.platform.modules.billing.dto.response.PlanStatsResponse.PlanRow;
import com.uav.platform.modules.billing.dto.response.PlanStatsResponse.Summary;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.enums.InvoiceStatus;
import com.uav.platform.modules.billing.repository.InvoiceRepository;
import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.billing.repository.UserQuotaRepository;
import com.uav.platform.modules.billing.service.PlanStatisticsService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Builds plan statistics from five grouped queries (quota usage, invoice totals, monthly revenue,
 * first subscriptions, near-limit customers) plus the plan list; nothing is loaded per customer.
 * Times use the server zone through {@link LocalDateTime#now()}, like the rest of billing.
 */
@Service
@RequiredArgsConstructor
public class PlanStatisticsServiceImpl implements PlanStatisticsService {
    static final int DEFAULT_MONTHS = 6;
    static final int MAX_MONTHS = 24;
    static final int NEAR_LIMIT_ROWS = 10;
    static final int EXPIRING_DAYS = 7;

    private static final BigDecimal TWELVE = BigDecimal.valueOf(12);

    private final ServicePlanRepository plans;
    private final UserQuotaRepository quotas;
    private final InvoiceRepository invoices;

    @Override
    @Transactional(readOnly = true)
    public PlanStatsResponse stats(int months) {
        return stats(months, LocalDateTime.now());
    }

    PlanStatsResponse stats(int months, LocalDateTime now) {
        int span = Math.min(Math.max(months, 1), MAX_MONTHS);
        YearMonth current = YearMonth.from(now);
        LocalDateTime monthStart = current.atDay(1).atStartOfDay();
        LocalDateTime nextMonth = current.plusMonths(1).atDay(1).atStartOfDay();
        LocalDateTime lastMonth = current.minusMonths(1).atDay(1).atStartOfDay();
        YearMonth first = current.minusMonths(span - 1L);
        LocalDateTime windowStart = first.atDay(1).atStartOfDay();

        List<ServicePlan> catalog = plans.findAll(Sort.by("price", "id"));
        Map<Long, Object[]> usage = byId(quotas.usageByPlan(now, now.plusDays(EXPIRING_DAYS)));
        Map<Long, Object[]> totals =
                byId(
                        invoices.totalsByPlan(
                                InvoiceStatus.PENDING,
                                InvoiceStatus.PAID,
                                now,
                                lastMonth,
                                monthStart,
                                nextMonth));

        long customers = 0;
        long paying = 0;
        long nearLimit = 0;
        long expiring = 0;
        BigDecimal mrr = BigDecimal.ZERO;
        for (Object[] row : usage.values()) customers += count(row[1]);

        List<PlanRow> rows = new ArrayList<>(catalog.size());
        for (ServicePlan plan : catalog) {
            Object[] u = usage.get(plan.getId());
            Object[] i = totals.get(plan.getId());
            long subscribers = u == null ? 0 : count(u[1]);
            long payingSubscribers = u == null ? 0 : count(u[2]);
            long planNearLimit = u == null ? 0 : count(u[4]);
            long planExpiring = u == null ? 0 : count(u[5]);
            paying += payingSubscribers;
            nearLimit += planNearLimit;
            expiring += planExpiring;
            mrr = mrr.add(monthlyPrice(plan).multiply(BigDecimal.valueOf(payingSubscribers)));
            rows.add(
                    new PlanRow(
                            plan.getId(),
                            plan.getCode(),
                            plan.getName(),
                            plan.getActive(),
                            plan.getPrice(),
                            plan.getBillingCycle(),
                            subscribers,
                            payingSubscribers,
                            percent(subscribers, customers),
                            u == null || u[3] == null ? 0 : round1(((Number) u[3]).doubleValue()),
                            planNearLimit,
                            planExpiring,
                            bucket(i, 1),
                            bucket(i, 3),
                            i == null ? BigDecimal.ZERO : money(i[5]),
                            i == null ? BigDecimal.ZERO : money(i[7])));
        }

        BigDecimal revenueThisMonth = BigDecimal.ZERO;
        BigDecimal revenueLastMonth = BigDecimal.ZERO;
        BigDecimal missionThisMonth = BigDecimal.ZERO;
        long pendingCount = 0;
        long overdueCount = 0;
        BigDecimal pendingAmount = BigDecimal.ZERO;
        BigDecimal overdueAmount = BigDecimal.ZERO;
        for (Map.Entry<Long, Object[]> entry : totals.entrySet()) {
            Object[] i = entry.getValue();
            pendingCount += count(i[1]);
            pendingAmount = pendingAmount.add(money(i[2]));
            overdueCount += count(i[3]);
            overdueAmount = overdueAmount.add(money(i[4]));
            revenueThisMonth = revenueThisMonth.add(money(i[5]));
            revenueLastMonth = revenueLastMonth.add(money(i[6]));
            if (entry.getKey() == null) missionThisMonth = missionThisMonth.add(money(i[5]));
        }

        Summary summary =
                new Summary(
                        customers,
                        paying,
                        customers - paying,
                        mrr.setScale(2, RoundingMode.HALF_UP),
                        revenueThisMonth,
                        revenueLastMonth,
                        revenueThisMonth.subtract(missionThisMonth),
                        missionThisMonth,
                        new InvoiceBucket(pendingCount, pendingAmount),
                        new InvoiceBucket(overdueCount, overdueAmount),
                        nearLimit,
                        expiring);
        return new PlanStatsResponse(
                now,
                summary,
                rows,
                monthly(catalog, first, span, windowStart, nextMonth),
                nearLimitCustomers());
    }

    private List<MonthRow> monthly(
            List<ServicePlan> catalog,
            YearMonth first,
            int span,
            LocalDateTime from,
            LocalDateTime to) {
        Map<YearMonth, Map<String, BigDecimal>> byPlan = new HashMap<>();
        Map<YearMonth, BigDecimal> missions = new HashMap<>();
        for (Object[] row : invoices.paidByMonthAndPlan(InvoiceStatus.PAID, from, to)) {
            YearMonth month = YearMonth.of((int) count(row[0]), (int) count(row[1]));
            String code = (String) row[2];
            if (code == null) missions.merge(month, money(row[3]), BigDecimal::add);
            else
                byPlan.computeIfAbsent(month, m -> new HashMap<>())
                        .merge(code, money(row[3]), BigDecimal::add);
        }
        Map<YearMonth, Long> subscriptions = new HashMap<>();
        for (Object[] row : invoices.firstPlanPaymentsByMonth(InvoiceStatus.PAID, from, to))
            subscriptions.put(
                    YearMonth.of((int) count(row[0]), (int) count(row[1])), count(row[2]));

        List<MonthRow> result = new ArrayList<>(span);
        for (int k = 0; k < span; k++) {
            YearMonth month = first.plusMonths(k);
            Map<String, BigDecimal> paid = byPlan.getOrDefault(month, Map.of());
            Map<String, BigDecimal> amounts = new LinkedHashMap<>();
            for (ServicePlan plan : catalog)
                amounts.put(plan.getCode(), paid.getOrDefault(plan.getCode(), BigDecimal.ZERO));
            BigDecimal mission = missions.getOrDefault(month, BigDecimal.ZERO);
            BigDecimal total = mission;
            for (BigDecimal amount : paid.values()) total = total.add(amount);
            result.add(
                    new MonthRow(
                            String.format(
                                    Locale.ROOT,
                                    "%04d-%02d",
                                    month.getYear(),
                                    month.getMonthValue()),
                            total,
                            amounts,
                            mission,
                            subscriptions.getOrDefault(month, 0L)));
        }
        return result;
    }

    private List<NearLimitCustomer> nearLimitCustomers() {
        return quotas.nearLimit(PageRequest.of(0, NEAR_LIMIT_ROWS)).stream()
                .map(
                        row -> {
                            double used = ((Number) row[4]).doubleValue();
                            double limit = ((Number) row[5]).doubleValue();
                            return new NearLimitCustomer(
                                    ((Number) row[0]).longValue(),
                                    (String) row[1],
                                    (String) row[2],
                                    (String) row[3],
                                    used,
                                    limit,
                                    round1(used * 100 / limit));
                        })
                .toList();
    }

    /** What one paying customer adds to monthly recurring revenue; a yearly price counts 1/12. */
    static BigDecimal monthlyPrice(ServicePlan plan) {
        BigDecimal price = plan.getPrice() == null ? BigDecimal.ZERO : plan.getPrice();
        return "YEARLY"
                        .equals(
                                plan.getBillingCycle() == null
                                        ? null
                                        : plan.getBillingCycle().toUpperCase(Locale.ROOT))
                ? price.divide(TWELVE, 2, RoundingMode.HALF_UP)
                : price;
    }

    private static Map<Long, Object[]> byId(List<Object[]> rows) {
        Map<Long, Object[]> map = new HashMap<>();
        for (Object[] row : rows)
            map.put(row[0] == null ? null : ((Number) row[0]).longValue(), row);
        return map;
    }

    private static InvoiceBucket bucket(Object[] row, int index) {
        return row == null
                ? new InvoiceBucket(0, BigDecimal.ZERO)
                : new InvoiceBucket(count(row[index]), money(row[index + 1]));
    }

    private static long count(Object value) {
        return value == null ? 0 : ((Number) value).longValue();
    }

    private static BigDecimal money(Object value) {
        if (value == null) return BigDecimal.ZERO;
        return value instanceof BigDecimal amount ? amount : new BigDecimal(value.toString());
    }

    private static double percent(long part, long whole) {
        return whole == 0 ? 0 : round1(part * 100.0 / whole);
    }

    private static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
