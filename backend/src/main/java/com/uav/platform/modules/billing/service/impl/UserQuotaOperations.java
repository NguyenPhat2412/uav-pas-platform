package com.uav.platform.modules.billing.service.impl;

import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.entity.UserQuota;
import com.uav.platform.modules.user.entity.AppUser;

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
        entity.setCycleStart(LocalDateTime.now());
        entity.setCycleEnd(LocalDateTime.now().plusMonths(1));
        return entity;
    }
}
