package com.uav.platform.dto.response.support;

import java.time.LocalDateTime;

public record SupportThreadResponse(
        Long id,
        String code,
        String fullName,
        String organization,
        String contactInfo,
        String topic,
        String source,
        String status,
        int unreadForAdmin,
        int unreadForVisitor,
        String lastMessagePreview,
        String lastSenderRole,
        String assignedAdminUsername,
        long messageCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
