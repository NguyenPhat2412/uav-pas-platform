package com.uav.platform.modules.billing.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.billing.config.request.UpdateQuotaRequest;
import com.uav.platform.modules.billing.config.response.UserQuotaResponse;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.entity.UserQuota;
import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.billing.repository.UserQuotaRepository;
import com.uav.platform.modules.billing.service.QuotaService;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class IQuotaService implements QuotaService {

    private final UserQuotaRepository quotaRepository;
    private final ServicePlanRepository planRepository;
    private final UserRepository userRepository;

    public IQuotaService(UserQuotaRepository quotaRepository,
                         ServicePlanRepository planRepository,
                         UserRepository userRepository) {
        this.quotaRepository = quotaRepository;
        this.planRepository = planRepository;
        this.userRepository = userRepository;
    }

    private UserQuota getOrCreateUserQuota(Long userId) {
        return quotaRepository.findByUserId(userId).orElseGet(() -> {
            AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> SystemException.notFound("User not found: " + userId));
            ServicePlan defaultPlan = planRepository.findByCode("BASIC")
                .orElseGet(() -> planRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> SystemException.notFound("Default service plan not found")));

            UserQuota newQuota = new UserQuota(user, defaultPlan);
            return quotaRepository.save(newQuota);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public UserQuotaResponse getQuota(Authentication authentication) {
        AppUser user = userRepository.findByUsername(authentication.getName())
            .orElseThrow(() -> SystemException.notFound("User not found: " + authentication.getName()));
        UserQuota quota = getOrCreateUserQuota(user.getId());
        return toResponse(quota);
    }

    @Override
    @Transactional(readOnly = true)
    public UserQuotaResponse getQuotaByUserId(Long userId) {
        UserQuota quota = getOrCreateUserQuota(userId);
        return toResponse(quota);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserQuotaResponse> listQuotas(Pageable pageable) {
        return PageResponse.from(quotaRepository.findAll(pageable).map(this::toResponse));
    }

    @Override
    public UserQuotaResponse updateQuota(Long userId, UpdateQuotaRequest request) {
        UserQuota quota = getOrCreateUserQuota(userId);
        ServicePlan plan = planRepository.findByCode(request.planCode())
            .orElseThrow(() -> SystemException.notFound("Service plan not found: " + request.planCode()));
        if (!Boolean.TRUE.equals(plan.getActive())) {
            throw SystemException.badRequest("Service plan is inactive");
        }
        quota.setPlan(plan);
        quota.setFlightHoursLimit(request.flightHoursLimit() != null ? request.flightHoursLimit() : plan.getMaxMonthlyFlightHours());
        quota.setConcurrentUavsLimit(plan.getMaxConcurrentUavs());
        return toResponse(quotaRepository.save(quota));
    }

    @Override
    @Transactional(readOnly = true)
    public void checkCanCreateMission(Long userId, double estimatedHours) {
        UserQuota quota = getOrCreateUserQuota(userId);
        if (quota.getFlightHoursUsed() + estimatedHours > quota.getFlightHoursLimit()) {
            throw SystemException.conflict(String.format(
                "Đã vượt hạn mức bay của gói %s! Đã dùng %.1f / %.1f giờ. Vui lòng nâng cấp gói cước để tiếp tục tạo nhiệm vụ.",
                quota.getPlan().getName(), quota.getFlightHoursUsed(), quota.getFlightHoursLimit()
            ));
        }
    }

    @Override
    public void recordMissionUsage(Long userId, double hoursUsed) {
        UserQuota quota = getOrCreateUserQuota(userId);
        quota.setFlightHoursUsed(quota.getFlightHoursUsed() + hoursUsed);
        quotaRepository.save(quota);
    }

    private UserQuotaResponse toResponse(UserQuota q) {
        double remaining = Math.max(0.0, q.getFlightHoursLimit() - q.getFlightHoursUsed());
        return new UserQuotaResponse(
            q.getId(),
            q.getUser().getId(),
            q.getUser().getUsername(),
            q.getUser().getFullName(),
            q.getPlan().getCode(),
            q.getPlan().getName(),
            q.getFlightHoursUsed(),
            q.getFlightHoursLimit(),
            remaining,
            q.getConcurrentUavsUsed(),
            q.getConcurrentUavsLimit(),
            q.getCycleStart(),
            q.getCycleEnd()
        );
    }
}
