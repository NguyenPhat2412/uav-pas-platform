package com.uav.platform.dto.response.billing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Payment and spending statistics for the admin dashboard. Money is whole VND. "Period" figures
 * cover [from, to] inclusive; outstanding, aging and review figures are measured now.
 */
public record PaymentStatisticsResponse(
        LocalDate from,
        LocalDate to,
        Period period,
        Period previous,
        Outstanding outstanding,
        List<MonthPoint> monthly,
        List<Slice> byGateway,
        List<Slice> bySource,
        List<Slice> byPlan,
        List<Slice> byStatus,
        List<Slice> aging,
        Review review,
        List<CustomerSpend> topCustomers) {

    /**
     * collected: invoices paid in the window. issued: invoices created in the window.
     * collectionRate: share of the issued amount (cancelled excluded) already paid, in percent.
     * avgDaysToPay: mean days from issue to payment for invoices paid in the window.
     * refunded: transfers an admin marked refunded in the window.
     */
    public record Period(
            BigDecimal collected,
            long paidCount,
            BigDecimal issued,
            long issuedCount,
            double collectionRate,
            double avgDaysToPay,
            BigDecimal averageInvoice,
            BigDecimal refunded,
            long payingCustomers) {}

    public record Outstanding(
            long pendingCount, BigDecimal pendingAmount, long overdueCount, BigDecimal overdueAmount) {}

    public record MonthPoint(
            String month, BigDecimal issued, BigDecimal collected, BigDecimal refunded) {}

    public record Slice(String key, long count, BigDecimal amount) {}

    /** Transfers that reached the account without settling an invoice and are not refunded yet. */
    public record Review(
            long pendingCount,
            BigDecimal pendingAmount,
            long mismatchCount,
            long unmatchedCount,
            long refundedCount,
            BigDecimal refundedAmount) {}

    public record CustomerSpend(
            Long userId, String name, long paidCount, BigDecimal paid, BigDecimal outstanding) {}
}
