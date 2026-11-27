package com.uav.platform.dto.request;

import com.uav.platform.enums.PaymentMethod;

public record PayInvoiceRequest(PaymentMethod paymentMethod) {}
