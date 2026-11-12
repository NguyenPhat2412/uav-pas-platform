package com.uav.platform.service.billing;

import com.uav.platform.dto.record.billing.PaymentAccountSettings;

/** Resolves payment settings from system_configurations first, then app.billing.* properties. */
public interface PaymentSettingsService {
    String BANK_BIN = "billing.bank_bin";
    String BANK_NAME = "billing.bank_name";
    String BANK_ACCOUNT_NUMBER = "billing.bank_account_number";
    String BANK_ACCOUNT_NAME = "billing.bank_account_name";
    String VAT_RATE = "billing.vat_rate";

    PaymentAccountSettings current();
}
