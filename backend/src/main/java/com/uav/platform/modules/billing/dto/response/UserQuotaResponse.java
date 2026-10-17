package com.uav.platform.modules.billing.dto.response;

import java.time.LocalDateTime;

public record UserQuotaResponse(
        Long id,
        Long userId,
        String username,
        String fullName,
        String planCode,
        String planName,
        Double flightHoursUsed,
        Double flightHoursLimit,
        Double flightHoursRemaining,
        Integer concurrentUavsUsed,
        Integer concurrentUavsLimit,
        LocalDateTime cycleStart,
        LocalDateTime cycleEnd) {}
