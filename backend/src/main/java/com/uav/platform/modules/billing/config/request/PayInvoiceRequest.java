package com.uav.platform.modules.billing.config.request;

import com.uav.platform.modules.billing.common.PaymentMethod;

public record PayInvoiceRequest(
    PaymentMethod paymentMethod
) {}
