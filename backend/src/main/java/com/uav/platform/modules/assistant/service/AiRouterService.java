package com.uav.platform.modules.assistant.service;

import com.uav.platform.modules.assistant.dto.request.AiRouterSettingsRequest;
import com.uav.platform.modules.assistant.dto.request.AssistantChatRequest;
import com.uav.platform.modules.assistant.dto.response.AiRouterSettingsResponse;
import com.uav.platform.modules.assistant.dto.response.AiRouterStatusResponse;
import com.uav.platform.modules.assistant.dto.response.AssistantChatResponse;
import com.uav.platform.modules.assistant.dto.response.AssistantInfoResponse;

import org.springframework.security.core.Authentication;

/** Admin management of the 9router gateway and the assistant chat that runs through it. */
public interface AiRouterService {
    AiRouterSettingsResponse settings();

    AiRouterSettingsResponse update(AiRouterSettingsRequest request, Authentication auth);

    AiRouterStatusResponse status();

    AssistantInfoResponse info();

    AssistantChatResponse chat(AssistantChatRequest request, Authentication auth);
}
