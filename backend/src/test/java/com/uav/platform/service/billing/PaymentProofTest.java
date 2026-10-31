package com.uav.platform.service.billing;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.billing.PaymentIpnRequest;
import com.uav.platform.entity.billing.*;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.billing.*;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.impl.billing.BillingServiceImpl;
import com.uav.platform.service.permission.PermissionService;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

class PaymentProofTest {
    @Test
    void customerLoginIsNotPaymentProofAndUnconfiguredGatewayCannotWrite() {
        var invoices = mock(InvoiceRepository.class);
        var payments = mock(PaymentTransactionRepository.class);
        var users = mock(UserRepository.class);
        var permissions = mock(PermissionService.class);
        var owner = new AppUser("owner", "owner@example.test", "hash", null, UserStatus.ACTIVE);
        owner.setId(1L);
        var invoice =
                new Invoice(
                        "INV-PROOF",
                        owner,
                        null,
                        null,
                        BigDecimal.TEN,
                        LocalDateTime.now().plusDays(7),
                        null);
        invoice.setId(1L);
        lenient().when(invoices.findByCode("INV-PROOF")).thenReturn(Optional.of(invoice));
        lenient().when(users.findByUsername("owner")).thenReturn(Optional.of(owner));
        var service =
                new BillingServiceImpl(
                        mock(ServicePlanRepository.class),
                        invoices,
                        payments,
                        users,
                        mock(MissionRepository.class),
                        permissions);
        var request = new PaymentIpnRequest("INV-PROOF", 1L, "TX-PROOF", BigDecimal.TEN, "FAILED");
        var error =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.processPaymentIpn(
                                        request,
                                        null,
                                        UsernamePasswordAuthenticationToken.authenticated(
                                                "owner", "", List.of())));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
        assertNull(invoice.getPaidAt());
        verify(invoices, never()).save(any());
        verifyNoInteractions(payments);
    }

    @Test
    void signatureCoversStatusAndBothInvoiceIdentifiers() {
        var service =
                new BillingServiceImpl(
                        mock(ServicePlanRepository.class),
                        mock(InvoiceRepository.class),
                        mock(PaymentTransactionRepository.class),
                        mock(UserRepository.class),
                        mock(MissionRepository.class),
                        mock(PermissionService.class),
                        null,
                        null,
                        "ephemeral-test-signing-key-not-a-provider");
        var success = new PaymentIpnRequest("INV", 1L, "TX", BigDecimal.TEN, "SUCCESS");
        assertNotEquals(
                service.computeIpnSignature(success),
                service.computeIpnSignature(
                        new PaymentIpnRequest("INV", 1L, "TX", BigDecimal.TEN, "FAILED")));
        assertNotEquals(
                service.computeIpnSignature(success),
                service.computeIpnSignature(
                        new PaymentIpnRequest("INV", 2L, "TX", BigDecimal.TEN, "SUCCESS")));
    }
}
