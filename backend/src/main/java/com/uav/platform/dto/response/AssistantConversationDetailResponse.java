package com.uav.platform.dto.response;

import java.util.List;

public record AssistantConversationDetailResponse(
        AssistantConversationResponse conversation, List<AssistantMessageResponse> messages) {}
