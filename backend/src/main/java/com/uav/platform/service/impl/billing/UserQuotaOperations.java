package com.uav.platform.service.impl.billing;

import com.uav.platform.entity.billing.ServicePlan;
import com.uav.platform.entity.billing.UserQuota;
import com.uav.platform.entity.user.AppUser;

import java.time.LocalDateTime;

/** Internal creation rules shared by application services and setup callers. */
public final class UserQuotaOperations {
    private UserQuotaOperations() {}

    public static UserQuota create(AppUser user, ServicePlan plan) {
        UserQuota entity = new UserQuota();
        entity.setUser(user);
        entity.setPlan(plan);
        entity.setFlightHoursUsed(0.0);
        entity.setFlightHoursLimit(plan.getMaxMonthlyFlightHours());
        entity.setConcurrentUavsUsed(0);
        entity.setConcurrentUavsLimit(plan.getMaxConcurrentUavs());
        // One clock read: the cycle is exactly one billing period of the plan (month or year).
        LocalDateTime now = LocalDateTime.now();
        entity.setCycleStart(now);
        entity.setCycleEnd(QuotaServiceImpl.advance(now, plan.getBillingCycle()));
        return entity;
    }
}
