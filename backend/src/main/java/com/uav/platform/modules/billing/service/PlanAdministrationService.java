package com.uav.platform.modules.billing.service;

import com.uav.platform.modules.billing.dto.request.ServicePlanRequest;
import com.uav.platform.modules.billing.dto.request.ServicePlanUpdateRequest;
import com.uav.platform.modules.billing.dto.response.ServicePlanResponse;

import java.util.List;

/** Service plan catalog management for administrators. */
public interface PlanAdministrationService {
    /** Every plan including inactive ones; the public listing only shows active plans. */
    List<ServicePlanResponse> listAll();

    ServicePlanResponse create(ServicePlanRequest request, String actor);

    ServicePlanResponse update(Long id, ServicePlanUpdateRequest request, String actor);

    /**
     * Shows or hides a plan for new subscriptions. Any plan may be hidden, BASIC included: the
     * starting plan of new customers and the fallback of lapsed paid plans is looked up by code,
     * so it keeps working while hidden.
     */
    ServicePlanResponse setActive(Long id, boolean active, String actor);
}
