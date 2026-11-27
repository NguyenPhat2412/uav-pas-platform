package com.uav.platform.dto.response;

import java.time.LocalDateTime;

public record AdminOtpTokenResponse(
        Long id,
        Long userId,
        String username,
        String email,
        String purpose,
        int attempts,
        int maxAttempts,
        String status,
        LocalDateTime createdAt,
        LocalDateTime expiresAt,
        LocalDateTime consumedAt) {}
