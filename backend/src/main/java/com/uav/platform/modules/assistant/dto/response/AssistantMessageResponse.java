package com.uav.platform.modules.assistant.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record AssistantMessageResponse(
        Long id,
        String role,
        String content,
        Integer mode,
        String model,
        Integer promptTokens,
        Integer completionTokens,
        Integer latencyMs,
        LocalDateTime createdAt,
        List<AssistantAttachmentResponse> attachments) {}
