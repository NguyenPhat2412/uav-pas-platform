package com.uav.platform.modules.billing.service;

import com.uav.platform.modules.billing.dto.response.PlanStatsResponse;

/** Subscriber, usage and revenue statistics per service plan for administrators. */
public interface PlanStatisticsService {
    /** Every plan including inactive ones; monthly covers the last {@code months} (1..24) months. */
    PlanStatsResponse stats(int months);
}
