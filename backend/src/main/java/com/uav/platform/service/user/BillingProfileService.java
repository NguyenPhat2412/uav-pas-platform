package com.uav.platform.service.user;

import com.uav.platform.dto.request.user.BillingProfileRequest;
import com.uav.platform.dto.response.user.BillingProfileResponse;

public interface BillingProfileService {
    BillingProfileResponse get(String username);

    /** Admin read by user id; an empty profile (version 0) when the customer never saved one. */
    BillingProfileResponse getForUser(Long userId);

    /** Throws 409 BILLING_PROFILE_STALE when expectedVersion no longer matches. */
    BillingProfileResponse update(String username, BillingProfileRequest request);
}
