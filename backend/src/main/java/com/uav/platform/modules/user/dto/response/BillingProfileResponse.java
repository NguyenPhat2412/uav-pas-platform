package com.uav.platform.modules.user.dto.response;

import java.time.LocalDateTime;

/** version is 0 for a profile that has never been saved. */
public record BillingProfileResponse(
        String organizationName,
        String taxCode,
        String billingAddress,
        String emergencyContactName,
        String emergencyContactPhone,
        long version,
        LocalDateTime updatedAt) {}
