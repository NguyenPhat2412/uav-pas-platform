package com.uav.platform.service.billing;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.billing.IInvoiceDao;
import com.uav.platform.dao.billing.IPaymentTransactionDao;
import com.uav.platform.dao.billing.IServicePlanDao;
import com.uav.platform.dao.mission.IMissionDao;
import com.uav.platform.dao.settings.ISystemConfigurationDao;
import com.uav.platform.dao.user.IUserDao;
import com.uav.platform.dto.record.billing.reconciliation.PaymentAccountSettings;
import com.uav.platform.dto.request.billing.reconciliation.PaymentGatewayConfigUpdateRequest;
import com.uav.platform.dto.response.billing.invoice.PaymentResponse;
import com.uav.platform.dto.response.billing.reconciliation.PaymentGatewayConfigResponse;
import com.uav.platform.entity.billing.Invoice;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.enums.billing.PaymentMethod;
import com.uav.platform.service.billing.reconciliation.PaymentSettingsService;
import com.uav.platform.service.impl.billing.invoice.BillingAdminServiceImpl;
import com.uav.platform.service.impl.billing.invoice.BillingServiceImpl;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.service.settings.SystemConfigService;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

class BillingPaymentGatewayTest {

    @Test
    void payInvoiceReturnsVietQrAwaitingTransferWhenBankAccountIsConfigured() {
        IInvoiceDao invoiceRepository = mock(IInvoiceDao.class);
        IPaymentTransactionDao paymentRepository = mock(IPaymentTransactionDao.class);
        IUserDao userRepository = mock(IUserDao.class);
        PermissionService permissions = mock(PermissionService.class);
        PaymentSettingsService paymentSettings = mock(PaymentSettingsService.class);

        BillingServiceImpl service =
                new BillingServiceImpl(
                        mock(IServicePlanDao.class),
                        invoiceRepository,
                        paymentRepository,
                        userRepository,
                        mock(IMissionDao.class),
                        permissions);
        service.setPaymentSettingsService(paymentSettings);

        AppUser owner = new AppUser();
        owner.setId(7L);
        owner.setUsername("pilot7");

        Invoice invoice =
                new Invoice(
                        "INV-20261112-AA11BB",
                        owner,
                        null,
                        null,
                        new BigDecimal("1500000"),
                        LocalDateTime.now().plusDays(5),
                        "Gói PRO");
        invoice.setId(77L);

        var auth = UsernamePasswordAuthenticationToken.authenticated("pilot7", null, List.of());
        when(userRepository.findByUsername("pilot7")).thenReturn(Optional.of(owner));
        when(invoiceRepository.findById(77L)).thenReturn(Optional.of(invoice));
        when(paymentSettings.current())
                .thenReturn(
                        new PaymentAccountSettings(
                                "970436",
                                "Vietcombank",
                                "0123456789",
                                "CONG TY UAV PAS",
                                new BigDecimal("0.10")));

        PaymentResponse response = service.payInvoice(77L, null, auth);

        assertEquals(77L, response.invoiceId());
        assertEquals("INV-20261112-AA11BB", response.invoiceCode());
        assertEquals(PaymentMethod.BANK_TRANSFER, response.paymentMethod());
        assertEquals("AWAITING_TRANSFER", response.status());
        assertEquals(InvoiceStatus.PENDING, response.invoiceStatus());
        assertNotNull(response.qrCodeUrl());
        assertTrue(response.qrCodeUrl().startsWith("000201"));
        assertEquals(InvoiceStatus.PENDING, invoice.getStatus());
        verifyNoInteractions(paymentRepository);
    }

    @Test
    void adminPaymentGatewayConfigPersistsAllFiveBillingKeysAndBuildsSampleQr() {
        IPaymentTransactionDao payments = mock(IPaymentTransactionDao.class);
        PaymentSettingsService paymentSettings = mock(PaymentSettingsService.class);
        SystemConfigService configService = mock(SystemConfigService.class);
        ISystemConfigurationDao configRepo = mock(ISystemConfigurationDao.class);
        when(configRepo.findByConfigKey(any())).thenReturn(Optional.empty());
        when(paymentSettings.current())
                .thenReturn(
                        new PaymentAccountSettings(
                                "970422",
                                "MB Bank",
                                "8888999966",
                                "UAV PAS PLATFORM",
                                new BigDecimal("0.08")));

        BillingAdminServiceImpl adminService =
                new BillingAdminServiceImpl(
                        payments,
                        paymentSettings,
                        configService,
                        configRepo,
                        true,
                        "0123456789abcdef0123456789abcdef");

        var auth = UsernamePasswordAuthenticationToken.authenticated("admin", null, List.of());
        PaymentGatewayConfigResponse updated =
                adminService.updatePaymentGatewayConfig(
                        new PaymentGatewayConfigUpdateRequest(
                                "970422",
                                "MB Bank",
                                "8888999966",
                                "UAV PAS PLATFORM",
                                new BigDecimal("0.08")),
                        auth);

        verify(configService).update(eq(PaymentSettingsService.BANK_BIN), any(), eq(auth));
        verify(configService).update(eq(PaymentSettingsService.BANK_NAME), any(), eq(auth));
        verify(configService)
                .update(eq(PaymentSettingsService.BANK_ACCOUNT_NUMBER), any(), eq(auth));
        verify(configService).update(eq(PaymentSettingsService.BANK_ACCOUNT_NAME), any(), eq(auth));
        verify(configService).update(eq(PaymentSettingsService.VAT_RATE), any(), eq(auth));

        assertTrue(updated.bankTransferConfigured());
        assertTrue(updated.webhookAutoReconcileReady());
        assertEquals("/api/v1/billing/webhook/sepay", updated.sepayWebhookPath());
        assertEquals("/api/v1/billing/webhook/payment-ipn", updated.ipnWebhookPath());
        assertNotNull(updated.sampleQrPayload());
    }
}
