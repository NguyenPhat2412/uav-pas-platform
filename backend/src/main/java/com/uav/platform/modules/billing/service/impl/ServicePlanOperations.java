package com.uav.platform.modules.billing.service.impl;

import com.uav.platform.modules.billing.entity.ServicePlan;

import java.math.BigDecimal;

/** Internal creation rules shared by application services and setup callers. */
public final class ServicePlanOperations {
    private ServicePlanOperations() {}

    public static ServicePlan create(
            String code,
            String name,
            BigDecimal price,
            String billingCycle,
            Double maxMonthlyFlightHours,
            Integer maxConcurrentUavs,
            Boolean allowSarAi,
            String description) {
        ServicePlan entity = new ServicePlan();
        entity.setCode(code);
        entity.setName(name);
        entity.setPrice(price != null ? price : BigDecimal.ZERO);
        entity.setBillingCycle(billingCycle != null ? billingCycle : "MONTHLY");
        entity.setMaxMonthlyFlightHours(
                maxMonthlyFlightHours != null ? maxMonthlyFlightHours : 20.0);
        entity.setMaxConcurrentUavs(maxConcurrentUavs != null ? maxConcurrentUavs : 1);
        entity.setAllowSarAi(allowSarAi != null ? allowSarAi : false);
        entity.setDescription(description);
        entity.setActive(true);
        return entity;
    }
}
