package com.uav.platform.modules.billing.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.billing.dto.request.UpdateQuotaRequest;
import com.uav.platform.modules.billing.dto.response.UserQuotaResponse;

import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

public interface QuotaService {
    UserQuotaResponse getQuota(Authentication authentication);

    UserQuotaResponse getQuotaByUserId(Long userId);

    PageResponse<UserQuotaResponse> listQuotas(Pageable pageable);

    UserQuotaResponse updateQuota(Long userId, UpdateQuotaRequest request);

    void checkCanCreateMission(Long userId, double estimatedHours);

    /**
     * Throws 409 QUOTA_FLIGHT_HOURS_EXCEEDED when used hours + planned hours of the customer's open
     * missions (except excludeMissionId) + plannedHours exceed the limit. Locks the customer's quota.
     */
    void checkCanSchedule(Long userId, double plannedHours, Long excludeMissionId);

    /** Settles a paid plan invoice: applies the invoiced plan (even if retired since) and extends its period. */
    void applyPaidPlan(Long userId, com.uav.platform.modules.billing.entity.ServicePlan plan);

    /** Resets used hours of ended cycles and downgrades lapsed paid plans; safe to run repeatedly. */
    void rollOverDueQuotas();

    void recordMissionUsage(Long userId, double hoursUsed);
}
