package com.uav.platform.dto.response;

import java.time.LocalDateTime;

public record AdminOtpSupportResponse(
        String email, String action, String message, LocalDateTime processedAt) {}
