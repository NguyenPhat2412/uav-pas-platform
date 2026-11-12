package com.uav.platform.service.impl.billing;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.billing.UpdateQuotaRequest;
import com.uav.platform.dto.response.billing.UserQuotaResponse;
import com.uav.platform.entity.billing.ServicePlan;
import com.uav.platform.entity.billing.UserQuota;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.billing.BillingMapper;
import com.uav.platform.repository.billing.ServicePlanRepository;
import com.uav.platform.repository.billing.UserQuotaRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.billing.QuotaService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class QuotaServiceImpl implements QuotaService {
    /** Free plan every account falls back to when a paid period lapses. */
    static final String DEFAULT_PLAN_CODE = "BASIC";

    /** Missions in these states no longer hold planned hours (completed ones are in "used"). */
    static final EnumSet<MissionStatus> CLOSED_MISSIONS =
            EnumSet.of(
                    MissionStatus.COMPLETED,
                    MissionStatus.CANCELLED,
                    MissionStatus.FAILED,
                    MissionStatus.REJECTED);

    /** Upper bound on cycles advanced in one refresh (100 years of monthly cycles). */
    private static final int MAX_CYCLES_PER_REFRESH = 1200;

    private final UserQuotaRepository quotaRepository;
    private final ServicePlanRepository planRepository;
    private final UserRepository userRepository;
    private final BillingMapper billingMapper;
    private final MissionRepository missionRepository;
    private final PlatformTransactionManager transactionManager;

    @Value("${app.billing.quota-rollover-enabled:true}")
    private boolean rolloverEnabled = true;

    private UserQuota getOrCreateUserQuota(Long userId) {
        // The user row exists before the quota: lock it for both creation and every mutation.
        AppUser user =
                userRepository
                        .findByIdForUpdate(userId)
                        .orElseThrow(() -> SystemException.notFound("User not found: " + userId));
        UserQuota quota =
                quotaRepository
                        .findByUserId(userId)
                        .orElseGet(
                                () ->
                                        quotaRepository.save(
                                                UserQuotaOperations.create(user, defaultPlan())));
        // Lazy rollover: a read or booking never works on a cycle that already ended.
        if (refresh(quota, LocalDateTime.now())) quotaRepository.save(quota);
        return quota;
    }

    private ServicePlan defaultPlan() {
        return planRepository
                .findByCode(DEFAULT_PLAN_CODE)
                .orElseThrow(
                        () -> SystemException.conflict("Default service plan is not configured"));
    }

    /**
     * Brings a quota up to date at {@code now}: a lapsed paid period falls back to the free plan,
     * and every cycle that ended resets used hours and advances by the plan's billing cycle.
     * Idempotent: a second call at the same instant changes nothing. Returns whether it changed.
     */
    boolean refresh(UserQuota quota, LocalDateTime now) {
        boolean changed = false;
        if (quota.getPlanPaidUntil() != null && !now.isBefore(quota.getPlanPaidUntil())) {
            ServicePlan free = planRepository.findByCode(DEFAULT_PLAN_CODE).orElse(null);
            if (free != null) {
                quota.setPlan(free);
                quota.setFlightHoursLimit(free.getMaxMonthlyFlightHours());
                quota.setConcurrentUavsLimit(free.getMaxConcurrentUavs());
            }
            quota.setPlanPaidUntil(null);
            changed = true;
        }
        String cycle = quota.getPlan() == null ? null : quota.getPlan().getBillingCycle();
        if (quota.getCycleStart() == null || quota.getCycleEnd() == null) {
            quota.setCycleStart(now);
            quota.setCycleEnd(advance(now, cycle));
            changed = true;
        }
        for (int i = 0; i < MAX_CYCLES_PER_REFRESH && !now.isBefore(quota.getCycleEnd()); i++) {
            quota.setCycleStart(quota.getCycleEnd());
            quota.setCycleEnd(advance(quota.getCycleEnd(), cycle));
            quota.setFlightHoursUsed(0.0);
            changed = true;
        }
        return changed;
    }

    static LocalDateTime advance(LocalDateTime from, String billingCycle) {
        return "YEARLY".equals(billingCycle == null ? null : billingCycle.toUpperCase(Locale.ROOT))
                ? from.plusYears(1)
                : from.plusMonths(1);
    }

    /** Hourly job: rolls over quotas nobody has touched since their cycle or paid period ended. */
    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @Scheduled(
            fixedDelayString = "${app.billing.quota-rollover-delay-ms:3600000}",
            initialDelayString = "${app.billing.quota-rollover-initial-delay-ms:120000}")
    public void rollOverDueQuotas() {
        if (!rolloverEnabled) return;
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        List<Long> due =
                tx.execute(
                        s ->
                                quotaRepository.dueForRollover(
                                        LocalDateTime.now(), PageRequest.of(0, 500)));
        if (due == null) return;
        for (Long userId : due) {
            try {
                // One short transaction per account under its user-row lock, like every booking.
                tx.executeWithoutResult(s -> getOrCreateUserQuota(userId));
            } catch (RuntimeException ex) {
                log.warn(
                        "Quota rollover failed: userId={}, error={}",
                        userId,
                        ex.getClass().getSimpleName());
            }
        }
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
        // An admin (or free-plan) assignment does not expire; re-saving the paid plan keeps its
        // period.
        if (quota.getPlan() == null || !Objects.equals(quota.getPlan().getId(), plan.getId()))
            quota.setPlanPaidUntil(null);
        quota.setPlan(plan);
        quota.setFlightHoursLimit(
                request.flightHoursLimit() != null
                        ? request.flightHoursLimit()
                        : plan.getMaxMonthlyFlightHours());
        quota.setConcurrentUavsLimit(plan.getMaxConcurrentUavs());
        return billingMapper.toQuotaResponse(quotaRepository.save(quota));
    }

    @Override
    public void applyPaidPlan(Long userId, ServicePlan plan) {
        UserQuota quota = getOrCreateUserQuota(userId);
        LocalDateTime now = LocalDateTime.now();
        // The invoice was issued for this plan, so it applies even if the plan was retired since.
        boolean renewal =
                quota.getPlan() != null
                        && Objects.equals(quota.getPlan().getId(), plan.getId())
                        && quota.getPlanPaidUntil() != null
                        && quota.getPlanPaidUntil().isAfter(now);
        LocalDateTime from = renewal ? quota.getPlanPaidUntil() : now;
        // Applying a plan changes limits and the paid period; consumed hours and cycle dates stay.
        quota.setPlan(plan);
        quota.setFlightHoursLimit(plan.getMaxMonthlyFlightHours());
        quota.setConcurrentUavsLimit(plan.getMaxConcurrentUavs());
        quota.setPlanPaidUntil(
                plan.getPrice() != null && plan.getPrice().signum() > 0
                        ? advance(from, plan.getBillingCycle())
                        : null);
        quotaRepository.save(quota);
    }

    @Override
    public void checkCanCreateMission(Long userId, double estimatedHours) {
        checkCanSchedule(userId, estimatedHours, null);
    }

    @Override
    public void checkCanSchedule(Long userId, double plannedHours, Long excludeMissionId) {
        if (!Double.isFinite(plannedHours) || plannedHours < 0)
            throw SystemException.badRequest("Invalid planned hours");
        // Locks the customer's user row: concurrent bookings of one customer are checked in turn.
        UserQuota quota = getOrCreateUserQuota(userId);
        if (quota.getFlightHoursLimit() == null) return;
        double reserved = openPlannedHours(userId, excludeMissionId);
        double used = quota.getFlightHoursUsed() == null ? 0.0 : quota.getFlightHoursUsed();
        if (used + reserved + plannedHours > quota.getFlightHoursLimit() + 1e-9) {
            throw SystemException.conflict(
                    String.format(
                            Locale.ROOT,
                            "Đã vượt hạn mức bay của gói %s! Đã dùng %.1f giờ, đã đặt %.1f giờ cho các nhiệm vụ đang mở, cần thêm %.1f / %.1f giờ. Vui lòng nâng cấp gói cước để tiếp tục tạo nhiệm vụ.",
                            quota.getPlan().getName(),
                            used,
                            reserved,
                            plannedHours,
                            quota.getFlightHoursLimit()),
                    "QUOTA_FLIGHT_HOURS_EXCEEDED");
        }
    }

    /** Planned hours of the customer's missions that are still open (not closed). */
    private double openPlannedHours(Long userId, Long excludeMissionId) {
        if (missionRepository == null) return 0.0;
        double total = 0.0;
        for (Mission m :
                missionRepository.findByCustomerIdAndStatusNotIn(userId, CLOSED_MISSIONS)) {
            if (excludeMissionId != null && excludeMissionId.equals(m.getId())) continue;
            total += FlightHoursOperations.plannedHours(m.getStartTime(), m.getExpectedEndTime());
        }
        return total;
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
