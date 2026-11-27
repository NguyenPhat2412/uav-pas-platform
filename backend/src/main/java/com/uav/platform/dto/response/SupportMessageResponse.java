package com.uav.platform.dto.response;

import java.time.LocalDateTime;

public record SupportMessageResponse(
        Long id,
        String senderRole,
        String senderName,
        String content,
        LocalDateTime createdAt,
        LocalDateTime deliveredAt,
        LocalDateTime readAt,
        String seenByName) {

    public SupportMessageResponse(
            Long id,
            String senderRole,
            String senderName,
            String content,
            LocalDateTime createdAt) {
        this(id, senderRole, senderName, content, createdAt, null, null, null);
    }
}
