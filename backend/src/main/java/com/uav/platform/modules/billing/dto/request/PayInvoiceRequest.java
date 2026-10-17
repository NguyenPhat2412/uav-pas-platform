package com.uav.platform.modules.billing.dto.request;

import com.uav.platform.modules.billing.enums.PaymentMethod;

public record PayInvoiceRequest(PaymentMethod paymentMethod) {}
