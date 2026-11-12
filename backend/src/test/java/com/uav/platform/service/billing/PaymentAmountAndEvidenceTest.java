package com.uav.platform.service.billing;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.billing.CreateInvoiceRequest;
import com.uav.platform.dto.request.billing.PaymentIpnRequest;
import com.uav.platform.entity.billing.*;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.billing.*;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.impl.billing.BillingServiceImpl;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.service.webhook.FinancialOutboxService;

import jakarta.validation.Validation;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/** VND invoices are whole đồng; refused provider transfers leave a visible trace. */
class PaymentAmountAndEvidenceTest {
    final InvoiceRepository invoices = mock(InvoiceRepository.class);
    final PaymentTransactionRepository payments = mock(PaymentTransactionRepository.class);
    final UserRepository users = mock(UserRepository.class);
    final PermissionService permissions = mock(PermissionService.class);
    final AppUser owner = new AppUser("owner", "owner@vnd.test", "hash", null, UserStatus.ACTIVE);
    final BillingServiceImpl billing =
            new BillingServiceImpl(
                    mock(ServicePlanRepository.class),
                    invoices,
                    payments,
                    users,
                    mock(MissionRepository.class),
                    permissions,
                    null,
                    null,
                    "isolated-test-fixture-key-not-real-provider-2026");

    {
        owner.setId(1L);
        ReflectionTestUtils.setField(billing, "providerEnabled", true);
        ReflectionTestUtils.setField(
                billing, "billingJdbc", mock(org.springframework.jdbc.core.JdbcTemplate.class));
        ReflectionTestUtils.setField(
                billing, "financialEvents", mock(FinancialOutboxService.class));
        when(payments.save(any())).thenAnswer(i -> i.getArgument(0));
        when(invoices.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    Invoice invoice(String amount, InvoiceStatus status) {
        Invoice invoice =
                new Invoice(
                        "INV-VND-1",
                        owner,
                        null,
                        null,
                        new BigDecimal(amount),
                        LocalDateTime.now().plusDays(7),
                        null);
        invoice.setId(10L);
        invoice.setStatus(status);
        when(invoices.findByCode("INV-VND-1")).thenReturn(Optional.of(invoice));
        return invoice;
    }

    PaymentIpnRequest ipn(String txn, String amount) {
        return new PaymentIpnRequest("INV-VND-1", 10L, txn, new BigDecimal(amount), "SUCCESS");
    }

    @Test
    void wrongAmountIsRejectedButStoredAsMismatchWithRawPayload() {
        invoice("500000", InvoiceStatus.PENDING);
        var wrong = ipn("TXN-WRONG", "450000");
        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () ->
                                billing.processPaymentIpn(
                                        wrong, billing.computeIpnSignature(wrong), null));
        assertEquals("INVALID_PAYMENT_AMOUNT", ex.getCode());
        var saved = ArgumentCaptor.forClass(PaymentTransaction.class);
        verify(payments).save(saved.capture());
        assertEquals("MISMATCH", saved.getValue().getStatus());
        assertEquals("TXN-WRONG", saved.getValue().getTransactionCode());
        assertEquals(0, new BigDecimal("450000").compareTo(saved.getValue().getAmount()));
        assertTrue(saved.getValue().getRawIpnCallback().contains("TXN-WRONG"));
    }

    @Test
    void lateTransferForAPaidInvoiceIsStoredAsUnmatched() {
        invoice("500000", InvoiceStatus.PAID);
        var late = ipn("TXN-LATE", "500000");
        SystemException ex =
                assertThrows(
                        SystemException.class,
                        () ->
                                billing.processPaymentIpn(
                                        late, billing.computeIpnSignature(late), null));
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        var saved = ArgumentCaptor.forClass(PaymentTransaction.class);
        verify(payments).save(saved.capture());
        assertEquals("UNMATCHED", saved.getValue().getStatus());
    }

    @Test
    void fractionalLegacyInvoiceSettlesWithTheWholeDongAmountShownInTheQr() {
        Invoice legacy = invoice("123456.50", InvoiceStatus.PENDING);
        var paid = ipn("TXN-ROUND", "123457");
        var result = billing.processPaymentIpn(paid, billing.computeIpnSignature(paid), null);
        assertEquals("00", result.status());
        assertEquals(InvoiceStatus.PAID, legacy.getStatus());
    }

    @Test
    void createdInvoicesAreRoundedToWholeDong() {
        when(users.findByUsername("admin")).thenReturn(Optional.of(admin()));
        when(users.findById(1L)).thenReturn(Optional.of(owner));
        when(permissions.has(any(), eq("USER_MANAGE"))).thenReturn(true);
        var created =
                billing.createInvoice(
                        new CreateInvoiceRequest(1L, null, null, new BigDecimal("99999.5"), null),
                        UsernamePasswordAuthenticationToken.authenticated("admin", "", List.of()));
        assertEquals(0, new BigDecimal("100000").compareTo(created.amount()));
    }

    @Test
    void createInvoiceRequestRequiresWholeDong() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertFalse(
                    validator
                            .validate(
                                    new CreateInvoiceRequest(
                                            1L, null, null, new BigDecimal("1000.50"), null))
                            .isEmpty());
            assertTrue(
                    validator
                            .validate(
                                    new CreateInvoiceRequest(
                                            1L, null, null, new BigDecimal("1000.00"), null))
                            .isEmpty());
        }
    }

    private AppUser admin() {
        AppUser admin = new AppUser("admin", "admin@vnd.test", "hash", null, UserStatus.ACTIVE);
        admin.setId(2L);
        return admin;
    }
}
