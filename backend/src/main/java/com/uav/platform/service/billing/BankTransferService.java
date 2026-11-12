package com.uav.platform.service.billing;

import com.uav.platform.dto.response.billing.BankTransferInstructionsResponse;
import com.uav.platform.dto.response.billing.BankTransferStatusResponse;

import org.springframework.security.core.Authentication;

/** VietQR / NAPAS 247 bank transfer details, driven entirely by APP_BILLING_BANK_* configuration. */
public interface BankTransferService {
    BankTransferStatusResponse status();

    /** Throws PAYMENT_UNAVAILABLE when the receiving account is not configured. */
    BankTransferInstructionsResponse instructions(Long invoiceId, Authentication auth);

    boolean configured();
}
