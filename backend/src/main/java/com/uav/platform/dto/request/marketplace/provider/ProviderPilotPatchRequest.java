package com.uav.platform.dto.request.marketplace.provider;

import com.uav.platform.enums.marketplace.ProviderPilotStatus;

import jakarta.validation.constraints.Size;

public record ProviderPilotPatchRequest(
        @Size(max = 160) String fullName,
        @Size(max = 160) String email,
        @Size(max = 30) String phone,
        @Size(max = 80) String licenseNumber,
        @Size(max = 120) String specialization,
        ProviderPilotStatus status,
        Long assignedUavId) {}
