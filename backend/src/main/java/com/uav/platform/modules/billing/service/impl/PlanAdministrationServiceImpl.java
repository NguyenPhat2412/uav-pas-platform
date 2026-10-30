package com.uav.platform.modules.billing.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.billing.dto.request.ServicePlanRequest;
import com.uav.platform.modules.billing.dto.request.ServicePlanUpdateRequest;
import com.uav.platform.modules.billing.dto.response.ServicePlanResponse;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.mapper.BillingMapper;
import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.billing.service.PlanAdministrationService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlanAdministrationServiceImpl implements PlanAdministrationService {
    static final String PLAN_EXISTS = "Service plan code already exists";

    private final ServicePlanRepository plans;
    private final BillingMapper mapper;
    private final AuditLogService audit;

    @Override
    @Transactional(readOnly = true)
    public List<ServicePlanResponse> listAll() {
        return plans.findAll(Sort.by("price", "id")).stream().map(mapper::toPlanResponse).toList();
    }

    @Override
    @Transactional
    public ServicePlanResponse create(ServicePlanRequest request, String actor) {
        if (plans.findByCode(request.code()).isPresent())
            throw SystemException.conflict(PLAN_EXISTS);
        ServicePlan plan = new ServicePlan();
        plan.setCode(request.code());
        apply(
                plan,
                request.name(),
                request.price(),
                request.billingCycle(),
                request.maxMonthlyFlightHours(),
                request.maxConcurrentUavs(),
                request.allowSarAi(),
                request.description());
        plan.setActive(true);
        ServicePlan saved = plans.save(plan);
        audit.record(
                null,
                actor,
                AuditAction.CREATE,
                "SERVICE_PLAN",
                saved.getCode(),
                "price=" + saved.getPrice());
        return mapper.toPlanResponse(saved);
    }

    @Override
    @Transactional
    public ServicePlanResponse update(Long id, ServicePlanUpdateRequest request, String actor) {
        ServicePlan plan = find(id);
        apply(
                plan,
                request.name(),
                request.price(),
                request.billingCycle(),
                request.maxMonthlyFlightHours(),
                request.maxConcurrentUavs(),
                request.allowSarAi(),
                request.description());
        ServicePlan saved = plans.save(plan);
        audit.record(
                null,
                actor,
                AuditAction.UPDATE,
                "SERVICE_PLAN",
                saved.getCode(),
                "price=" + saved.getPrice());
        return mapper.toPlanResponse(saved);
    }

    @Override
    @Transactional
    public ServicePlanResponse setActive(Long id, boolean active, String actor) {
        ServicePlan plan = find(id);
        plan.setActive(active);
        ServicePlan saved = plans.save(plan);
        audit.record(
                null,
                actor,
                AuditAction.STATUS_CHANGE,
                "SERVICE_PLAN",
                saved.getCode(),
                active ? "ACTIVATED" : "DEACTIVATED");
        return mapper.toPlanResponse(saved);
    }

    private static void apply(
            ServicePlan plan,
            String name,
            java.math.BigDecimal price,
            String cycle,
            Double hours,
            Integer uavs,
            Boolean sarAi,
            String description) {
        plan.setName(name.trim());
        plan.setPrice(price);
        plan.setBillingCycle(cycle);
        plan.setMaxMonthlyFlightHours(hours);
        plan.setMaxConcurrentUavs(uavs);
        plan.setAllowSarAi(sarAi);
        plan.setDescription(
                description == null || description.isBlank() ? null : description.trim());
    }

    private ServicePlan find(Long id) {
        return plans.findById(id)
                .orElseThrow(() -> SystemException.notFound("Service plan not found"));
    }
}
