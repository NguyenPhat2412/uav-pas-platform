package com.uav.platform.modules.billing.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.billing.dto.request.UpdateQuotaRequest;
import com.uav.platform.modules.billing.dto.response.UserQuotaResponse;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.entity.UserQuota;
import com.uav.platform.modules.billing.mapper.BillingMapper;
import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.billing.repository.UserQuotaRepository;
import com.uav.platform.modules.billing.service.QuotaService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class QuotaServiceImpl implements QuotaService {

    private final UserQuotaRepository quotaRepository;
    private final ServicePlanRepository planRepository;
    private final UserRepository userRepository;
    private final BillingMapper billingMapper;

    private UserQuota getOrCreateUserQuota(Long userId) {
        // The user row exists before the quota: lock it for both creation and every mutation.
        AppUser user =
                userRepository
                        .findByIdForUpdate(userId)
                        .orElseThrow(() -> SystemException.notFound("User not found: " + userId));
        return quotaRepository
                .findByUserId(userId)
                .orElseGet(
                        () -> {
                            ServicePlan defaultPlan =
                                    planRepository
                                            .findByCode("BASIC")
                                            .orElseThrow(
                                                    () ->
                                                            SystemException.conflict(
                                                                    "Default service plan is not configured"));

                            UserQuota newQuota = UserQuotaOperations.create(user, defaultPlan);
                            return quotaRepository.save(newQuota);
                        });
    }

    @Override
    public UserQuotaResponse getQuota(Authentication authentication) {
        AppUser user =
                userRepository
                        .findByUsername(authentication.getName())
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "User not found: " + authentication.getName()));
        UserQuota quota = getOrCreateUserQuota(user.getId());
        return billingMapper.toQuotaResponse(quota);
    }

    @Override
    public UserQuotaResponse getQuotaByUserId(Long userId) {
        UserQuota quota = getOrCreateUserQuota(userId);
        return billingMapper.toQuotaResponse(quota);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserQuotaResponse> listQuotas(Pageable pageable) {
        return PageResponse.from(
                quotaRepository.findAll(pageable).map(billingMapper::toQuotaResponse));
    }

    @Override
    public UserQuotaResponse updateQuota(Long userId, UpdateQuotaRequest request) {
        UserQuota quota = getOrCreateUserQuota(userId);
        ServicePlan plan =
                planRepository
                        .findByCode(request.planCode())
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Service plan not found: " + request.planCode()));
        if (!Boolean.TRUE.equals(plan.getActive())) {
            throw SystemException.badRequest("Service plan is inactive");
        }
        quota.setPlan(plan);
        quota.setFlightHoursLimit(
                request.flightHoursLimit() != null
                        ? request.flightHoursLimit()
                        : plan.getMaxMonthlyFlightHours());
        quota.setConcurrentUavsLimit(plan.getMaxConcurrentUavs());
        return billingMapper.toQuotaResponse(quotaRepository.save(quota));
    }

    @Override
    public void checkCanCreateMission(Long userId, double estimatedHours) {
        UserQuota quota = getOrCreateUserQuota(userId);
        if (quota.getFlightHoursUsed() + estimatedHours > quota.getFlightHoursLimit()) {
            throw SystemException.conflict(
                    String.format(
                            "Đã vượt hạn mức bay của gói %s! Đã dùng %.1f / %.1f giờ. Vui lòng nâng cấp gói cước để tiếp tục tạo nhiệm vụ.",
                            quota.getPlan().getName(),
                            quota.getFlightHoursUsed(),
                            quota.getFlightHoursLimit()));
        }
    }

    @Override
    public void recordMissionUsage(Long userId, double hoursUsed) {
        if (!Double.isFinite(hoursUsed) || hoursUsed < 0)
            throw SystemException.badRequest("Invalid planned hours");
        UserQuota quota = getOrCreateUserQuota(userId);
        quota.setFlightHoursUsed(quota.getFlightHoursUsed() + hoursUsed);
        quotaRepository.save(quota);
    }
}
