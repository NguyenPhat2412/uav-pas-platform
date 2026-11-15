package com.uav.platform.dto.request.billing.invoice;

import com.uav.platform.enums.billing.PaymentMethod;

public record PayInvoiceRequest(PaymentMethod paymentMethod) {}
