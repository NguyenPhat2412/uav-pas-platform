package com.uav.platform.service.impl.billing;

import static com.uav.platform.specification.billing.BillingSpecifications.*;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.record.billing.PaymentAccountSettings;
import com.uav.platform.dto.request.billing.PaymentGatewayConfigUpdateRequest;
import com.uav.platform.dto.request.settings.UpdateConfigurationRequest;
import com.uav.platform.dto.response.billing.PaymentGatewayConfigResponse;
import com.uav.platform.dto.response.billing.PaymentTransactionAdminResponse;
import com.uav.platform.entity.billing.PaymentTransaction;
import com.uav.platform.enums.settings.SettingValueType;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.billing.PaymentTransactionRepository;
import com.uav.platform.repository.settings.SystemConfigurationRepository;
import com.uav.platform.service.billing.BillingAdminService;
import com.uav.platform.service.billing.PaymentSettingsService;
import com.uav.platform.service.impl.settings.SystemConfigurationOperations;
import com.uav.platform.service.settings.SystemConfigService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.regex.Pattern;

@Service
public class BillingAdminServiceImpl implements BillingAdminService {
    private static final Pattern SENSITIVE =
            Pattern.compile(
                    "(?i)\\b(signature|checksum|secret\\w*|token|password|api[_-]?key|hmac)(\\s*[=:]\\s*\"?)([^,\\s\")}]+)");

    private final PaymentTransactionRepository payments;
    private final PaymentSettingsService paymentSettingsService;
    private final SystemConfigService systemConfigService;
    private final SystemConfigurationRepository configRepository;
    private final boolean providerEnabled;
    private final String ipnSecret;

    public BillingAdminServiceImpl(PaymentTransactionRepository payments) {
        this(payments, null, null, null, false, "");
    }

    @Autowired
    public BillingAdminServiceImpl(
            PaymentTransactionRepository payments,
            @Autowired(required = false) PaymentSettingsService paymentSettingsService,
            @Autowired(required = false) SystemConfigService systemConfigService,
            @Autowired(required = false) SystemConfigurationRepository configRepository,
            @Value("${app.billing.provider-enabled:false}") boolean providerEnabled,
            @Value("${app.billing.ipn-secret:}") String ipnSecret) {
        this.payments = payments;
        this.paymentSettingsService = paymentSettingsService;
        this.systemConfigService = systemConfigService;
        this.configRepository = configRepository;
        this.providerEnabled = providerEnabled;
        this.ipnSecret = ipnSecret != null ? ipnSecret : "";
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PaymentTransactionAdminResponse> listTransactions(
            String status,
            String gateway,
            LocalDate from,
            LocalDate to,
            Long invoiceId,
            String keyword,
            Pageable pageable) {
        if (from != null && to != null && from.isAfter(to))
            throw SystemException.badRequest("from must not be after to", "INVALID_DATE_RANGE");
        Specification<PaymentTransaction> spec =
                Specification.allOf(
                        transactionStatus(status),
                        transactionGateway(gateway),
                        transactionCreatedFrom(from == null ? null : from.atStartOfDay()),
                        transactionCreatedBefore(to == null ? null : to.plusDays(1).atStartOfDay()),
                        transactionInvoice(invoiceId),
                        transactionKeyword(keyword));
        Pageable sorted =
                PageRequest.of(
                        pageable.getPageNumber(),
                        pageable.getPageSize(),
                        Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        return PageResponse.from(
                payments.findAll(spec, sorted), BillingAdminServiceImpl::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentGatewayConfigResponse getPaymentGatewayConfig() {
        PaymentAccountSettings current =
                paymentSettingsService != null
                        ? paymentSettingsService.current()
                        : new PaymentAccountSettings("", "", "", "", new BigDecimal("0.10"));
        boolean configured = current.configured();
        boolean secretOk = ipnSecret.length() >= 32;
        String sampleQr =
                configured
                        ? VietQrOperations.build(
                                current.bankBin(),
                                current.accountNumber(),
                                BigDecimal.valueOf(100_000L),
                                "UAV INV DEMO")
                        : null;
        return new PaymentGatewayConfigResponse(
                configured,
                current.bankBin(),
                current.bankName(),
                current.accountNumber(),
                current.accountName(),
                current.vatRate(),
                providerEnabled && secretOk && configured,
                providerEnabled,
                secretOk,
                ApiRoutes.Webhook.BASE + ApiRoutes.Webhook.SEPAY,
                ApiRoutes.Webhook.BASE + ApiRoutes.Webhook.PAYMENT_IPN,
                sampleQr);
    }

    @Override
    @Transactional
    public PaymentGatewayConfigResponse updatePaymentGatewayConfig(
            PaymentGatewayConfigUpdateRequest request, Authentication auth) {
        if (systemConfigService == null) {
            throw SystemException.serviceUnavailable(
                    "System configuration service unavailable", "SETTINGS_UNAVAILABLE");
        }
        String vatText =
                request.vatRate() != null
                        ? request.vatRate().stripTrailingZeros().toPlainString()
                        : "0.1";
        ensureSettingRowExists(
                PaymentSettingsService.BANK_BIN,
                SettingValueType.STRING,
                "Mã BIN NAPAS ngân hàng nhận chuyển khoản (6 chữ số)");
        ensureSettingRowExists(
                PaymentSettingsService.BANK_NAME,
                SettingValueType.STRING,
                "Tên ngân hàng nhận chuyển khoản VietQR");
        ensureSettingRowExists(
                PaymentSettingsService.BANK_ACCOUNT_NUMBER,
                SettingValueType.STRING,
                "Số tài khoản ngân hàng nhận thanh toán");
        ensureSettingRowExists(
                PaymentSettingsService.BANK_ACCOUNT_NAME,
                SettingValueType.STRING,
                "Tên chủ tài khoản nhận thanh toán");
        ensureSettingRowExists(
                PaymentSettingsService.VAT_RATE,
                SettingValueType.DECIMAL,
                "Thuế suất GTGT áp dụng trên hóa đơn (0..1)");

        systemConfigService.update(
                PaymentSettingsService.BANK_BIN,
                new UpdateConfigurationRequest(trimOrEmpty(request.bankBin()), null),
                auth);
        systemConfigService.update(
                PaymentSettingsService.BANK_NAME,
                new UpdateConfigurationRequest(trimOrEmpty(request.bankName()), null),
                auth);
        systemConfigService.update(
                PaymentSettingsService.BANK_ACCOUNT_NUMBER,
                new UpdateConfigurationRequest(trimOrEmpty(request.accountNumber()), null),
                auth);
        systemConfigService.update(
                PaymentSettingsService.BANK_ACCOUNT_NAME,
                new UpdateConfigurationRequest(trimOrEmpty(request.accountName()), null),
                auth);
        systemConfigService.update(
                PaymentSettingsService.VAT_RATE,
                new UpdateConfigurationRequest(vatText, null),
                auth);

        return getPaymentGatewayConfig();
    }

    private void ensureSettingRowExists(String key, SettingValueType type, String description) {
        if (configRepository == null || configRepository.findByConfigKey(key).isPresent()) {
            return;
        }
        var entity =
                SystemConfigurationOperations.createTyped(
                        key, "", "BILLING", type, null, null, null, false);
        entity.setDescription(description);
        configRepository.save(entity);
    }

    private static String trimOrEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    static PaymentTransactionAdminResponse toResponse(PaymentTransaction t) {
        var invoice = t.getInvoice();
        var user = t.getUser();
        return new PaymentTransactionAdminResponse(
                t.getId(),
                t.getTransactionCode(),
                t.getGatewayName(),
                t.getAmount(),
                t.getStatus(),
                t.getBankBin(),
                t.getBankAccountNumber(),
                invoice != null ? invoice.getId() : null,
                invoice != null ? invoice.getCode() : null,
                invoice != null && invoice.getStatus() != null ? invoice.getStatus().name() : null,
                invoice != null ? invoice.getAmount() : null,
                user != null ? user.getId() : null,
                user != null ? user.getUsername() : null,
                user != null ? user.getFullName() : null,
                user != null ? user.getEmail() : null,
                redact(t.getRawIpnCallback()),
                t.getCreatedAt(),
                t.getCompletedAt());
    }

    /** Provider callbacks are kept for audit; credential-like fields are masked before display. */
    static String redact(String raw) {
        if (raw == null) return null;
        return SENSITIVE.matcher(raw).replaceAll("$1$2****");
    }
}
