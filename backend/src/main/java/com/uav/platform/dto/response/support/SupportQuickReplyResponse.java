package com.uav.platform.dto.response.support;

import java.time.LocalDateTime;

public record SupportQuickReplyResponse(
        Long id,
        String title,
        String topic,
        String content,
        int sortOrder,
        String createdBy,
        LocalDateTime createdAt) {}
