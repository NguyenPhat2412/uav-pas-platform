package com.uav.platform.dto.response.billing;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Admin statistics per service plan. Money is VND; percentages are 0..100 with one decimal.
 * Pending invoice buckets include the overdue ones (PENDING past their due date).
 */
public record PlanStatsResponse(
        LocalDateTime generatedAt,
        Summary summary,
        List<PlanRow> plans,
        List<MonthRow> monthly,
        List<NearLimitCustomer> nearLimit) {

    public record Summary(
            long totalCustomers,
            long payingCustomers,
            long freeCustomers,
            BigDecimal mrr,
            BigDecimal revenueThisMonth,
            BigDecimal revenueLastMonth,
            BigDecimal planRevenueThisMonth,
            BigDecimal missionRevenueThisMonth,
            InvoiceBucket pendingInvoices,
            InvoiceBucket overdueInvoices,
            long nearLimitCustomers,
            long expiringSoon) {}

    public record PlanRow(
            Long planId,
            String code,
            String name,
            Boolean active,
            BigDecimal price,
            String billingCycle,
            long subscribers,
            long payingSubscribers,
            double sharePercent,
            double avgUsagePercent,
            long nearLimit,
            long expiringSoon,
            InvoiceBucket pendingInvoices,
            InvoiceBucket overdueInvoices,
            BigDecimal revenueThisMonth,
            BigDecimal revenueTotal) {}

    /** month is YYYY-MM; byPlan holds every plan code (0 when nothing was paid). */
    public record MonthRow(
            String month,
            BigDecimal total,
            Map<String, BigDecimal> byPlan,
            BigDecimal missionRevenue,
            long newSubscriptions) {}

    public record NearLimitCustomer(
            Long userId,
            String username,
            String fullName,
            String planCode,
            double usedHours,
            double limitHours,
            double percent) {}

    public record InvoiceBucket(long count, BigDecimal amount) {}
}
