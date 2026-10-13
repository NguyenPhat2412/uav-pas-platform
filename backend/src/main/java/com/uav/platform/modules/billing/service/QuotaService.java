package com.uav.platform.modules.billing.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.billing.config.request.UpdateQuotaRequest;
import com.uav.platform.modules.billing.config.response.UserQuotaResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

public interface QuotaService {
    UserQuotaResponse getQuota(Authentication authentication);
    UserQuotaResponse getQuotaByUserId(Long userId);
    PageResponse<UserQuotaResponse> listQuotas(Pageable pageable);
    UserQuotaResponse updateQuota(Long userId, UpdateQuotaRequest request);
    void checkCanCreateMission(Long userId, double estimatedHours);
    void recordMissionUsage(Long userId, double hoursUsed);
}
