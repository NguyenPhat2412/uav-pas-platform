package com.uav.platform.modules.user.service;

import com.uav.platform.modules.user.dto.request.BillingProfileRequest;
import com.uav.platform.modules.user.dto.response.BillingProfileResponse;

public interface BillingProfileService {
    BillingProfileResponse get(String username);

    /** Admin read by user id; an empty profile (version 0) when the customer never saved one. */
    BillingProfileResponse getForUser(Long userId);

    /** Throws 409 BILLING_PROFILE_STALE when expectedVersion no longer matches. */
    BillingProfileResponse update(String username, BillingProfileRequest request);
}
