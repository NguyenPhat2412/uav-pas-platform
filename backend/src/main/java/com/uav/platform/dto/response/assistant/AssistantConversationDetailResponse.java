package com.uav.platform.dto.response.assistant;

import java.util.List;

public record AssistantConversationDetailResponse(
        AssistantConversationResponse conversation, List<AssistantMessageResponse> messages) {}
