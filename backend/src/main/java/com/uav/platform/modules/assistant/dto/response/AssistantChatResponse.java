package com.uav.platform.modules.assistant.dto.response;

public record AssistantChatResponse(
        String reply,
        int mode,
        String model,
        long latencyMs,
        Integer promptTokens,
        Integer completionTokens,
        Long conversationId) {

    public AssistantChatResponse(
            String reply,
            int mode,
            String model,
            long latencyMs,
            Integer promptTokens,
            Integer completionTokens) {
        this(reply, mode, model, latencyMs, promptTokens, completionTokens, null);
    }
}
