package com.uav.platform.support;

import com.uav.platform.dao.billing.IServicePlanDao;
import com.uav.platform.service.impl.billing.plan.ServicePlanOperations;

import java.math.BigDecimal;

/** Explicit synthetic catalog data for mission tests whose H2 schemas do not run Flyway seeds. */
public final class ServicePlanTestData {
    private ServicePlanTestData() {}

    public static void ensureBasicPlan(IServicePlanDao plans) {
        if (plans.findByCode("BASIC").isEmpty()) {
            plans.save(
                    ServicePlanOperations.create(
                            "BASIC",
                            "Synthetic mission test plan",
                            BigDecimal.ZERO,
                            "MONTHLY",
                            20.0,
                            1,
                            false,
                            "Isolated test fixture; no production pricing"));
        }
    }
}
