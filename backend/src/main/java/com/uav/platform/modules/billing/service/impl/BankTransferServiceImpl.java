package com.uav.platform.modules.billing.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.billing.dto.record.PaymentAccountSettings;
import com.uav.platform.modules.billing.dto.response.BankTransferInstructionsResponse;
import com.uav.platform.modules.billing.dto.response.BankTransferStatusResponse;
import com.uav.platform.modules.billing.dto.response.InvoiceResponse;
import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.billing.service.BankTransferService;
import com.uav.platform.modules.billing.service.BillingService;
import com.uav.platform.modules.billing.service.PaymentSettingsService;
import com.uav.platform.modules.mission.repository.MissionRepository;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;

@Service
public class BankTransferServiceImpl implements BankTransferService {
    private final BillingService billing;
    private final ServicePlanRepository plans;
    private final MissionRepository missions;
    private final PaymentSettingsService paymentSettings;

    public BankTransferServiceImpl(
            BillingService billing,
            ServicePlanRepository plans,
            MissionRepository missions,
            PaymentSettingsService paymentSettings) {
        this.billing = billing;
        this.plans = plans;
        this.missions = missions;
        this.paymentSettings = paymentSettings;
    }

    @Override
    public boolean configured() {
        return paymentSettings.current().configured();
    }

    @Override
    public BankTransferStatusResponse status() {
        PaymentAccountSettings settings = paymentSettings.current();
        return new BankTransferStatusResponse(
                settings.configured(), settings.configured() ? settings.bankName() : null);
    }

    @Override
    @Transactional(readOnly = true)
    public BankTransferInstructionsResponse instructions(Long invoiceId, Authentication auth) {
        InvoiceResponse invoice = billing.getInvoice(invoiceId, auth);
        PaymentAccountSettings settings = paymentSettings.current();
        if (!settings.configured())
            throw SystemException.serviceUnavailable(
                    "Payment gateway is not configured", "PAYMENT_UNAVAILABLE");
        BigDecimal total = invoice.amount();
        BigDecimal vatRate = settings.vatRate();
        BigDecimal[] split = splitVat(total, vatRate);
        String content = transferContent(invoice.code());
        return new BankTransferInstructionsResponse(
                invoice.id(),
                invoice.code(),
                invoice.status().name(),
                settings.bankBin(),
                settings.bankName(),
                settings.accountNumber(),
                settings.accountName(),
                content,
                VietQrOperations.build(
                        settings.bankBin(), settings.accountNumber(), total, content),
                split[0],
                vatRate,
                split[1],
                total,
                invoice.missionTitle() != null ? invoice.missionTitle() : invoice.planName(),
                flightHours(invoice),
                invoice.dueDate(),
                invoice.createdAt());
    }

    /** "UAV INV" plus the invoice code without separators, matching what VietQR keeps in the memo. */
    static String transferContent(String invoiceCode) {
        return VietQrOperations.sanitizeMemo("UAV INV " + invoiceCode.replace("-", ""));
    }

    /** Amounts are VAT inclusive: subtotal = total / (1 + rate), rounded to whole dong; VAT is the remainder. */
    static BigDecimal[] splitVat(BigDecimal total, BigDecimal rate) {
        BigDecimal subtotal = total.divide(BigDecimal.ONE.add(rate), 0, RoundingMode.HALF_UP);
        return new BigDecimal[] {subtotal, total.subtract(subtotal)};
    }

    private Double flightHours(InvoiceResponse invoice) {
        if (invoice.missionId() != null) {
            return missions.findById(invoice.missionId())
                    .filter(m -> m.getStartTime() != null && m.getExpectedEndTime() != null)
                    .map(
                            m ->
                                    Duration.between(m.getStartTime(), m.getExpectedEndTime())
                                                    .toMinutes()
                                            / 60.0)
                    .orElse(null);
        }
        if (invoice.planId() != null) {
            return plans.findById(invoice.planId())
                    .map(p -> p.getMaxMonthlyFlightHours())
                    .orElse(null);
        }
        return null;
    }
}
