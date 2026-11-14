package com.uav.platform.service.billing;

import com.uav.platform.dto.response.billing.PaymentStatisticsResponse;

import java.time.LocalDate;

/** Read-only payment, revenue and spending figures for administrators. */
public interface PaymentStatisticsService {
    /** from and to are inclusive calendar days; both null means the last 30 days. */
    PaymentStatisticsResponse statistics(LocalDate from, LocalDate to);
}
