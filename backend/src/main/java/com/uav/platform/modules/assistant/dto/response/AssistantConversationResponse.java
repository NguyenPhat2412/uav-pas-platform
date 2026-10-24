package com.uav.platform.modules.assistant.dto.response;

import java.time.LocalDateTime;

public record AssistantConversationResponse(
        Long id,
        Long userId,
        String username,
        String fullName,
        String portal,
        String title,
        int messageCount,
        int totalTokens,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {}
