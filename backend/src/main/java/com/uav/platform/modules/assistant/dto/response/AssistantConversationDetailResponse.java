package com.uav.platform.modules.assistant.dto.response;

import java.util.List;

public record AssistantConversationDetailResponse(
        AssistantConversationResponse conversation, List<AssistantMessageResponse> messages) {}
