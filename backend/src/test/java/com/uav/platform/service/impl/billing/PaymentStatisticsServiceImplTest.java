package com.uav.platform.service.impl.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.uav.platform.dto.response.billing.PaymentStatisticsResponse;
import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.entity.billing.PaymentTransaction;
import com.uav.platform.entity.billing.ServicePlan;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.repository.billing.InvoiceRepository;
import com.uav.platform.repository.billing.PaymentTransactionRepository;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

class PaymentStatisticsServiceImplTest {
    private static final LocalDate START = LocalDate.of(2026, 11, 1);
    private static final LocalDate END = LocalDate.of(2026, 11, 30);
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 30, 12, 0);

    private final InvoiceRepository invoices = mock(InvoiceRepository.class);
    private final PaymentTransactionRepository payments = mock(PaymentTransactionRepository.class);
    private final PaymentStatisticsServiceImpl service =
            new PaymentStatisticsServiceImpl(invoices, payments);

    @Test
    void periodOutstandingAgingAndReviewFollowTheDefinitions() {
        AppUser alice = user(1L, "alice");
        AppUser bob = user(2L, "bob");
        ServicePlan pro = mock(ServicePlan.class);
        when(pro.getCode()).thenReturn("PRO");

        // Paid plan invoice: issued 2 days before payment.
        Invoice paidPlan = invoice(alice, "15000000", InvoiceStatus.PAID, at(5), at(12));
        paidPlan.setPaidAt(at(7));
        paidPlan.setPlan(pro);
        // Open invoice, 10 days overdue.
        Invoice overdue = invoice(bob, "500000", InvoiceStatus.PENDING, at(10), at(20));
        // Open invoice, not yet due.
        Invoice open = invoice(alice, "300000", InvoiceStatus.PENDING, at(28), at(35));
        // Cancelled invoices do not count against the collection rate.
        Invoice cancelled = invoice(bob, "999000", InvoiceStatus.CANCELLED, at(15), at(22));
        // Paid last month: only the previous period sees it.
        Invoice previous = invoice(bob, "200000", InvoiceStatus.PAID, at(-20), at(-13));
        previous.setPaidAt(at(-15));
        when(invoices.findForStatistics(any(), any(), eq(InvoiceStatus.PENDING)))
                .thenReturn(List.of(paidPlan, overdue, open, cancelled, previous));

        PaymentTransaction sepay = tx("SUCCESS", "VIETQR_SEPAY_AUTO", "15000000");
        sepay.setCompletedAt(at(7));
        PaymentTransaction mismatch = tx("MISMATCH", "VIETQR_SEPAY_AUTO", "450000");
        PaymentTransaction refunded = tx("UNMATCHED", "VIETQR_SEPAY_AUTO", "100000");
        refunded.setResolution("REFUNDED");
        refunded.setResolvedAt(at(20));
        when(payments.findForStatistics(any(), any(), any()))
                .thenReturn(List.of(sepay, mismatch, refunded));

        PaymentStatisticsResponse stats = service.compute(START, END, NOW);

        var period = stats.period();
        assertThat(period.collected()).isEqualByComparingTo("15000000");
        assertThat(period.paidCount()).isEqualTo(1);
        assertThat(period.issuedCount()).isEqualTo(4);
        // 15,000,000 paid of 15,800,000 billable (cancelled 999,000 excluded).
        assertThat(period.collectionRate()).isEqualTo(94.9);
        assertThat(period.avgDaysToPay()).isEqualTo(2.0);
        assertThat(period.refunded()).isEqualByComparingTo("100000");
        assertThat(stats.previous().collected()).isEqualByComparingTo("200000");

        assertThat(stats.outstanding().pendingAmount()).isEqualByComparingTo("800000");
        assertThat(stats.outstanding().overdueCount()).isEqualTo(1);
        assertThat(stats.aging())
                .extracting(PaymentStatisticsResponse.Slice::key, PaymentStatisticsResponse.Slice::count)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("NOT_DUE", 1L),
                        org.assertj.core.groups.Tuple.tuple("D1_7", 0L),
                        org.assertj.core.groups.Tuple.tuple("D8_30", 1L),
                        org.assertj.core.groups.Tuple.tuple("D31_PLUS", 0L));

        assertThat(stats.byPlan()).singleElement().extracting("key").isEqualTo("PRO");
        assertThat(stats.bySource()).singleElement().extracting("key").isEqualTo("PLAN");
        assertThat(stats.byGateway()).singleElement().extracting("key").isEqualTo("VIETQR_SEPAY_AUTO");
        assertThat(stats.review().pendingCount()).isEqualTo(1);
        assertThat(stats.review().pendingAmount()).isEqualByComparingTo("450000");
        assertThat(stats.topCustomers()).singleElement().satisfies(c -> {
            assertThat(c.name()).isEqualTo("alice");
            assertThat(c.outstanding()).isEqualByComparingTo("300000");
        });
        assertThat(stats.monthly()).hasSize(12);
        assertThat(stats.monthly().getLast().month()).isEqualTo("2026-11");
        assertThat(stats.monthly().getLast().collected()).isEqualByComparingTo("15000000");
    }

    private static LocalDateTime at(int dayOfNovember) {
        return LocalDateTime.of(2026, 11, 1, 9, 0).plusDays(dayOfNovember - 1L);
    }

    private static AppUser user(Long id, String name) {
        AppUser user = new AppUser(name, name + "@example.test", "hash", null, UserStatus.ACTIVE);
        user.setId(id);
        return user;
    }

    private static Invoice invoice(
            AppUser owner, String amount, InvoiceStatus status, LocalDateTime created, LocalDateTime due) {
        Invoice invoice = new Invoice("INV-" + created, owner, null, null, new BigDecimal(amount), due, null);
        invoice.setStatus(status);
        invoice.setCreatedAt(created);
        return invoice;
    }

    private static PaymentTransaction tx(String status, String gateway, String amount) {
        PaymentTransaction tx = new PaymentTransaction();
        tx.setStatus(status);
        tx.setGatewayName(gateway);
        tx.setAmount(new BigDecimal(amount));
        return tx;
    }
}
