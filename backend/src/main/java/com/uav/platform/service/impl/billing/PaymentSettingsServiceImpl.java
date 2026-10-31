package com.uav.platform.service.impl.billing;

import com.uav.platform.dto.record.billing.PaymentAccountSettings;
import com.uav.platform.service.billing.PaymentSettingsService;
import com.uav.platform.service.settings.SystemConfigService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Reads payment settings on every call so an admin change applies without a restart. An empty
 * database value means "not overridden" and falls back to the environment property.
 */
@Slf4j
@Service
public class PaymentSettingsServiceImpl implements PaymentSettingsService {
    private final SystemConfigService config;
    private final String envBankBin;
    private final String envBankName;
    private final String envAccountNumber;
    private final String envAccountName;
    private final BigDecimal envVatRate;

    public PaymentSettingsServiceImpl(
            SystemConfigService config,
            @Value("${app.billing.bank-bin:}") String bankBin,
            @Value("${app.billing.bank-name:}") String bankName,
            @Value("${app.billing.bank-account-number:}") String accountNumber,
            @Value("${app.billing.bank-account-name:}") String accountName,
            @Value("${app.billing.vat-rate:0.10}") BigDecimal vatRate) {
        this.config = config;
        this.envBankBin = bankBin;
        this.envBankName = bankName;
        this.envAccountNumber = accountNumber;
        this.envAccountName = accountName;
        this.envVatRate = vatRate;
    }

    @Override
    public PaymentAccountSettings current() {
        return new PaymentAccountSettings(
                resolve(read(BANK_BIN), envBankBin),
                resolve(read(BANK_NAME), envBankName),
                resolve(read(BANK_ACCOUNT_NUMBER), envAccountNumber),
                resolve(read(BANK_ACCOUNT_NAME), envAccountName),
                resolveVat(read(VAT_RATE), envVatRate));
    }

    private String read(String key) {
        try {
            return config.valueOrDefault(key, "");
        } catch (RuntimeException ex) {
            // Settings storage unavailable: keep payments working from the environment.
            log.warn("Payment setting {} unreadable, using environment value", key);
            return "";
        }
    }

    /** Database value wins when it has non-blank text; otherwise the trimmed environment value. */
    static String resolve(String databaseValue, String environmentValue) {
        if (databaseValue != null && !databaseValue.isBlank()) return databaseValue.trim();
        return environmentValue == null ? "" : environmentValue.trim();
    }

    /**
     * VAT is a fraction in [0, 1] (0.10 = 10%), the same semantics as app.billing.vat-rate. A
     * malformed or out-of-range database value is ignored rather than charging a wrong amount.
     */
    static BigDecimal resolveVat(String databaseValue, BigDecimal environmentValue) {
        if (databaseValue != null && !databaseValue.isBlank()) {
            BigDecimal parsed = parseRate(databaseValue.trim());
            if (parsed != null) return parsed;
            log.warn("Ignoring invalid billing.vat_rate; expected a fraction between 0 and 1");
        }
        if (validRate(environmentValue)) return environmentValue;
        return new BigDecimal("0.10");
    }

    static BigDecimal parseRate(String value) {
        try {
            BigDecimal rate = new BigDecimal(value);
            return validRate(rate) ? rate : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static boolean validRate(BigDecimal rate) {
        return rate != null && rate.signum() >= 0 && rate.compareTo(BigDecimal.ONE) <= 0;
    }
}
