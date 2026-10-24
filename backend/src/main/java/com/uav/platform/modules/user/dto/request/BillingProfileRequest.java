package com.uav.platform.modules.user.dto.request;

import jakarta.validation.constraints.*;

/**
 * Enterprise billing identity. taxCode follows the Vietnamese format: 10 digits, or 10 digits plus "-" and a
 * 3-digit branch suffix. expectedVersion guards against overwriting a concurrent edit.
 */
public record BillingProfileRequest(
        @NotNull @Min(0) Long expectedVersion,
        @Size(max = 200) String organizationName,
        @Pattern(regexp = "^$|\\d{10}(-\\d{3})?") String taxCode,
        @Size(max = 500) String billingAddress,
        @Size(max = 120) String emergencyContactName,
        @Pattern(regexp = "^$|\\+?[0-9 .-]{8,20}") String emergencyContactPhone) {}
