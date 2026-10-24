package com.uav.platform.modules.assistant.dto.response;

public record AssistantChatResponse(
        String reply,
        int mode,
        String model,
        long latencyMs,
        Integer promptTokens,
        Integer completionTokens) {}
