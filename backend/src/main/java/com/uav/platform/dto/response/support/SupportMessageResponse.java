package com.uav.platform.dto.response.support;

import java.time.LocalDateTime;

public record SupportMessageResponse(
        Long id, String senderRole, String senderName, String content, LocalDateTime createdAt) {}
