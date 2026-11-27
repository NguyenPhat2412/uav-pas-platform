package com.uav.platform.dto.response;

import com.uav.platform.enums.ProviderPilotStatus;

import java.time.LocalDateTime;

public record ProviderPilotResponse(
        Long id,
        Long providerId,
        Long userId,
        Long pilotUserId,
        String fullName,
        String email,
        String phone,
        String licenseNumber,
        String specialization,
        ProviderPilotStatus status,
        Long assignedUavId,
        String assignedUavModel,
        long completedMissionsCount,
        LocalDateTime createdAt) {}
