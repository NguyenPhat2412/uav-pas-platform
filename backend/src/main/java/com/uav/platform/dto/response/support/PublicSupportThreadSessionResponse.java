package com.uav.platform.dto.response.support;

import java.time.LocalDateTime;
import java.util.List;

public record PublicSupportThreadSessionResponse(
        Long threadId,
        String code,
        String visitorToken,
        String fullName,
        String organization,
        String contactInfo,
        String topic,
        String status,
        int unreadForVisitor,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<SupportMessageResponse> messages) {}
