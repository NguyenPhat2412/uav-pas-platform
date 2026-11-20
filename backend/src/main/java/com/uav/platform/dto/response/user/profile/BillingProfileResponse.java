package com.uav.platform.dto.response.user.profile;

import java.time.LocalDateTime;

/** version is 0 for a profile that has never been saved. */
public record BillingProfileResponse(
        String organizationName,
        String taxCode,
        String billingAddress,
        String billingEmail,
        String emergencyContactName,
        String emergencyContactPhone,
        long version,
        LocalDateTime updatedAt) {

    public BillingProfileResponse(
            String organizationName,
            String taxCode,
            String billingAddress,
            String emergencyContactName,
            String emergencyContactPhone,
            long version,
            LocalDateTime updatedAt) {
        this(
                organizationName,
                taxCode,
                billingAddress,
                null,
                emergencyContactName,
                emergencyContactPhone,
                version,
                updatedAt);
    }
}
