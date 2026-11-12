package com.uav.platform.service.assistant;

import com.uav.platform.dto.request.assistant.AiRouterSettingsRequest;
import com.uav.platform.dto.request.assistant.AssistantChatRequest;
import com.uav.platform.dto.response.assistant.AiRouterSettingsResponse;
import com.uav.platform.dto.response.assistant.AiRouterStatusResponse;
import com.uav.platform.dto.response.assistant.AssistantChatResponse;
import com.uav.platform.dto.response.assistant.AssistantInfoResponse;

import org.springframework.security.core.Authentication;

/** Admin management of the 9router gateway and the assistant chat that runs through it. */
public interface AiRouterService {
    AiRouterSettingsResponse settings();

    AiRouterSettingsResponse update(AiRouterSettingsRequest request, Authentication auth);

    AiRouterStatusResponse status();

    AssistantInfoResponse info();

    AssistantChatResponse chat(AssistantChatRequest request, Authentication auth);
}
