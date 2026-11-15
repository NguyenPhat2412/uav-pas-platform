package com.uav.platform.service.billing.plan;

import com.uav.platform.dto.response.billing.plan.PlanStatsResponse;

/** Subscriber, usage and revenue statistics per service plan for administrators. */
public interface PlanStatisticsService {
    /** Every plan including inactive ones; monthly covers the last {@code months} (1..24) months. */
    PlanStatsResponse stats(int months);
}
