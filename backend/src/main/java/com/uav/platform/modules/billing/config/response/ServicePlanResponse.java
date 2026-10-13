package com.uav.platform.modules.billing.config.response;

import java.math.BigDecimal;

public record ServicePlanResponse(
    Long id,
    String code,
    String name,
    BigDecimal price,
    String billingCycle,
    Double maxMonthlyFlightHours,
    Integer maxConcurrentUavs,
    Boolean allowSarAi,
    String description,
    Boolean active
) {}
