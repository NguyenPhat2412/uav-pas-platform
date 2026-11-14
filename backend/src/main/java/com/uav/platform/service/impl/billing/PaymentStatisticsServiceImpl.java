package com.uav.platform.service.impl.billing;

import com.uav.platform.dto.response.billing.PaymentStatisticsResponse;
import com.uav.platform.dto.response.billing.PaymentStatisticsResponse.CustomerSpend;
import com.uav.platform.dto.response.billing.PaymentStatisticsResponse.MonthPoint;
import com.uav.platform.dto.response.billing.PaymentStatisticsResponse.Outstanding;
import com.uav.platform.dto.response.billing.PaymentStatisticsResponse.Period;
import com.uav.platform.dto.response.billing.PaymentStatisticsResponse.Review;
import com.uav.platform.dto.response.billing.PaymentStatisticsResponse.Slice;
import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.entity.billing.PaymentTransaction;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.billing.InvoiceRepository;
import com.uav.platform.repository.billing.PaymentTransactionRepository;
import com.uav.platform.service.billing.PaymentStatisticsService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.function.Predicate;

/**
 * Computes the admin payment statistics in memory from one invoice query and one transaction
 * query. shortcut: loads every row of the 12-month window; move the sums into SQL group-bys once
 * invoices reach tens of thousands.
 */
@Service
@RequiredArgsConstructor
public class PaymentStatisticsServiceImpl implements PaymentStatisticsService {
    static final int TREND_MONTHS = 12;
    static final int MAX_RANGE_DAYS = 366;
    static final int TOP_CUSTOMERS = 5;
    private static final Set<String> REVIEW = Set.of("MISMATCH", "UNMATCHED");

    private final InvoiceRepository invoices;
    private final PaymentTransactionRepository payments;

    @Override
    @Transactional(readOnly = true)
    public PaymentStatisticsResponse statistics(LocalDate from, LocalDate to) {
        LocalDate end = to != null ? to : LocalDate.now();
        LocalDate start = from != null ? from : end.minusDays(29);
        if (start.isAfter(end))
            throw SystemException.badRequest("from must not be after to", "INVALID_DATE_RANGE");
        if (ChronoUnit.DAYS.between(start, end) >= MAX_RANGE_DAYS)
            throw SystemException.badRequest("Range is limited to one year", "INVALID_DATE_RANGE");
        return compute(start, end, LocalDateTime.now());
    }

    PaymentStatisticsResponse compute(LocalDate start, LocalDate end, LocalDateTime now) {
        LocalDateTime windowStart = start.atStartOfDay();
        LocalDateTime windowEnd = end.plusDays(1).atStartOfDay();
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        LocalDateTime previousStart = windowStart.minusDays(days);
        YearMonth firstMonth = YearMonth.from(end).minusMonths(TREND_MONTHS - 1L);
        LocalDateTime loadFrom = min(previousStart, firstMonth.atDay(1).atStartOfDay());

        List<Invoice> invoiceRows =
                invoices.findForStatistics(loadFrom, windowEnd, InvoiceStatus.PENDING);
        List<PaymentTransaction> txRows = payments.findForStatistics(loadFrom, windowEnd, REVIEW);

        return new PaymentStatisticsResponse(
                start,
                end,
                period(invoiceRows, txRows, windowStart, windowEnd),
                period(invoiceRows, txRows, previousStart, windowStart),
                outstanding(invoiceRows, now),
                monthly(invoiceRows, txRows, firstMonth),
                byGateway(txRows, windowStart, windowEnd),
                bySource(invoiceRows, windowStart, windowEnd),
                byPlan(invoiceRows, windowStart, windowEnd),
                byStatus(invoiceRows, windowStart, windowEnd),
                aging(invoiceRows, now),
                review(txRows, windowStart, windowEnd),
                topCustomers(invoiceRows, windowStart, windowEnd));
    }

    static Period period(
            List<Invoice> rows,
            List<PaymentTransaction> txs,
            LocalDateTime from,
            LocalDateTime to) {
        List<Invoice> paid = rows.stream().filter(paidIn(from, to)).toList();
        List<Invoice> issued = rows.stream().filter(i -> in(i.getCreatedAt(), from, to)).toList();
        BigDecimal collected = sum(paid);
        BigDecimal issuedAmount = sum(issued);
        BigDecimal billable =
                sum(issued.stream().filter(i -> i.getStatus() != InvoiceStatus.CANCELLED).toList());
        BigDecimal issuedPaid =
                sum(issued.stream().filter(i -> i.getStatus() == InvoiceStatus.PAID).toList());
        double avgDays =
                paid.stream()
                        .filter(i -> i.getCreatedAt() != null)
                        .mapToDouble(
                                i ->
                                        Duration.between(i.getCreatedAt(), i.getPaidAt())
                                                        .toMinutes()
                                                / 1440.0)
                        .average()
                        .orElse(0);
        BigDecimal refunded =
                txs.stream()
                        .filter(t -> "REFUNDED".equals(t.getResolution()))
                        .filter(t -> in(t.getResolvedAt(), from, to))
                        .map(PaymentTransaction::getAmount)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Period(
                collected,
                paid.size(),
                issuedAmount,
                issued.size(),
                percent(issuedPaid, billable),
                round1(avgDays),
                paid.isEmpty()
                        ? BigDecimal.ZERO
                        : collected.divide(
                                BigDecimal.valueOf(paid.size()), 0, RoundingMode.HALF_UP),
                refunded,
                paid.stream().map(i -> i.getUser().getId()).distinct().count());
    }

    static Outstanding outstanding(List<Invoice> rows, LocalDateTime now) {
        List<Invoice> pending = pending(rows);
        List<Invoice> overdue = pending.stream().filter(i -> i.getDueDate().isBefore(now)).toList();
        return new Outstanding(pending.size(), sum(pending), overdue.size(), sum(overdue));
    }

    static List<MonthPoint> monthly(
            List<Invoice> rows, List<PaymentTransaction> txs, YearMonth firstMonth) {
        Map<YearMonth, BigDecimal[]> months = new TreeMap<>();
        for (int i = 0; i < TREND_MONTHS; i++)
            months.put(
                    firstMonth.plusMonths(i),
                    new BigDecimal[] {BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
        for (Invoice invoice : rows) {
            add(months, invoice.getCreatedAt(), 0, invoice.getAmount());
            if (invoice.getStatus() == InvoiceStatus.PAID)
                add(months, invoice.getPaidAt(), 1, invoice.getAmount());
        }
        for (PaymentTransaction tx : txs)
            if ("REFUNDED".equals(tx.getResolution()))
                add(months, tx.getResolvedAt(), 2, tx.getAmount());
        return months.entrySet().stream()
                .map(
                        e ->
                                new MonthPoint(
                                        e.getKey().toString(),
                                        e.getValue()[0],
                                        e.getValue()[1],
                                        e.getValue()[2]))
                .toList();
    }

    /** Settled transfers per channel: SePay auto, signed IPN, or admin confirmation. */
    static List<Slice> byGateway(
            List<PaymentTransaction> txs, LocalDateTime from, LocalDateTime to) {
        return slices(
                txs.stream()
                        .filter(t -> "SUCCESS".equals(t.getStatus()))
                        .filter(t -> in(t.getCompletedAt(), from, to))
                        .toList(),
                PaymentTransaction::getGatewayName,
                PaymentTransaction::getAmount);
    }

    /** Collected money by what was bought: a plan subscription, a mission, or anything else. */
    static List<Slice> bySource(List<Invoice> rows, LocalDateTime from, LocalDateTime to) {
        return slices(
                rows.stream().filter(paidIn(from, to)).toList(),
                i -> i.getMission() != null ? "MISSION" : i.getPlan() != null ? "PLAN" : "OTHER",
                Invoice::getAmount);
    }

    static List<Slice> byPlan(List<Invoice> rows, LocalDateTime from, LocalDateTime to) {
        return slices(
                rows.stream()
                        .filter(paidIn(from, to))
                        .filter(i -> i.getMission() == null && i.getPlan() != null)
                        .toList(),
                i -> i.getPlan().getCode(),
                Invoice::getAmount);
    }

    /** Where the invoices issued in the window stand today. */
    static List<Slice> byStatus(List<Invoice> rows, LocalDateTime from, LocalDateTime to) {
        Map<String, Slice> result = new LinkedHashMap<>();
        for (InvoiceStatus status : InvoiceStatus.values())
            result.put(status.name(), new Slice(status.name(), 0, BigDecimal.ZERO));
        for (Slice slice :
                slices(
                        rows.stream().filter(i -> in(i.getCreatedAt(), from, to)).toList(),
                        i -> i.getStatus().name(),
                        Invoice::getAmount)) result.put(slice.key(), slice);
        return List.copyOf(result.values());
    }

    /** Open invoices by days past due: NOT_DUE, D1_7, D8_30, D31_PLUS. */
    static List<Slice> aging(List<Invoice> rows, LocalDateTime now) {
        Map<String, Slice> buckets = new LinkedHashMap<>();
        for (String key : List.of("NOT_DUE", "D1_7", "D8_30", "D31_PLUS"))
            buckets.put(key, new Slice(key, 0, BigDecimal.ZERO));
        for (Invoice invoice : pending(rows)) {
            long late = ChronoUnit.DAYS.between(invoice.getDueDate(), now);
            String key =
                    !invoice.getDueDate().isBefore(now)
                            ? "NOT_DUE"
                            : late <= 7 ? "D1_7" : late <= 30 ? "D8_30" : "D31_PLUS";
            Slice old = buckets.get(key);
            buckets.put(key, new Slice(key, old.count() + 1, old.amount().add(amount(invoice))));
        }
        return List.copyOf(buckets.values());
    }

    static Review review(List<PaymentTransaction> txs, LocalDateTime from, LocalDateTime to) {
        List<PaymentTransaction> open =
                txs.stream()
                        .filter(t -> REVIEW.contains(t.getStatus()) && t.getResolution() == null)
                        .toList();
        List<PaymentTransaction> refunded =
                txs.stream()
                        .filter(t -> "REFUNDED".equals(t.getResolution()))
                        .filter(t -> in(t.getResolvedAt(), from, to))
                        .toList();
        return new Review(
                open.size(),
                sumTx(open),
                open.stream().filter(t -> "MISMATCH".equals(t.getStatus())).count(),
                open.stream().filter(t -> "UNMATCHED".equals(t.getStatus())).count(),
                refunded.size(),
                sumTx(refunded));
    }

    /** Customers who paid the most in the window, with what they still owe now. */
    static List<CustomerSpend> topCustomers(
            List<Invoice> rows, LocalDateTime from, LocalDateTime to) {
        Map<Long, CustomerSpend> byUser = new LinkedHashMap<>();
        for (Invoice invoice : rows) {
            boolean paid = paidIn(from, to).test(invoice);
            boolean open = invoice.getStatus() == InvoiceStatus.PENDING;
            if (!paid && !open) continue;
            var user = invoice.getUser();
            CustomerSpend old =
                    byUser.getOrDefault(
                            user.getId(),
                            new CustomerSpend(
                                    user.getId(),
                                    user.getFullName() != null && !user.getFullName().isBlank()
                                            ? user.getFullName()
                                            : user.getUsername(),
                                    0,
                                    BigDecimal.ZERO,
                                    BigDecimal.ZERO));
            byUser.put(
                    user.getId(),
                    new CustomerSpend(
                            old.userId(),
                            old.name(),
                            old.paidCount() + (paid ? 1 : 0),
                            paid ? old.paid().add(amount(invoice)) : old.paid(),
                            open ? old.outstanding().add(amount(invoice)) : old.outstanding()));
        }
        return byUser.values().stream()
                .filter(c -> c.paid().signum() > 0)
                .sorted(Comparator.comparing(CustomerSpend::paid).reversed())
                .limit(TOP_CUSTOMERS)
                .toList();
    }

    private static <T> List<Slice> slices(
            List<T> items, Function<T, String> key, Function<T, BigDecimal> amount) {
        Map<String, Slice> result = new LinkedHashMap<>();
        for (T item : items) {
            String k = key.apply(item) == null ? "—" : key.apply(item);
            BigDecimal value = amount.apply(item) == null ? BigDecimal.ZERO : amount.apply(item);
            Slice old = result.getOrDefault(k, new Slice(k, 0, BigDecimal.ZERO));
            result.put(k, new Slice(k, old.count() + 1, old.amount().add(value)));
        }
        List<Slice> sorted = new ArrayList<>(result.values());
        sorted.sort(Comparator.comparing(Slice::amount).reversed());
        return sorted;
    }

    private static Predicate<Invoice> paidIn(LocalDateTime from, LocalDateTime to) {
        return i -> i.getStatus() == InvoiceStatus.PAID && in(i.getPaidAt(), from, to);
    }

    private static List<Invoice> pending(List<Invoice> rows) {
        return rows.stream()
                .filter(i -> i.getStatus() == InvoiceStatus.PENDING && i.getDueDate() != null)
                .toList();
    }

    private static boolean in(LocalDateTime at, LocalDateTime from, LocalDateTime to) {
        return at != null && !at.isBefore(from) && at.isBefore(to);
    }

    private static void add(
            Map<YearMonth, BigDecimal[]> months, LocalDateTime at, int slot, BigDecimal value) {
        if (at == null || value == null) return;
        BigDecimal[] row = months.get(YearMonth.from(at));
        if (row != null) row[slot] = row[slot].add(value);
    }

    private static BigDecimal amount(Invoice invoice) {
        return invoice.getAmount() == null ? BigDecimal.ZERO : invoice.getAmount();
    }

    private static BigDecimal sum(List<Invoice> list) {
        return list.stream()
                .map(PaymentStatisticsServiceImpl::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal sumTx(List<PaymentTransaction> list) {
        return list.stream()
                .map(PaymentTransaction::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static double percent(BigDecimal part, BigDecimal whole) {
        if (whole.signum() == 0) return 0;
        return part.multiply(BigDecimal.valueOf(100))
                .divide(whole, 1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }

    private static LocalDateTime min(LocalDateTime a, LocalDateTime b) {
        return a.isBefore(b) ? a : b;
    }
}
