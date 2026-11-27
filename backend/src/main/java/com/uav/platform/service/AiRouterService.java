package com.uav.platform.service;

import com.uav.platform.dto.request.AiRouterSettingsRequest;
import com.uav.platform.dto.request.AssistantChatRequest;
import com.uav.platform.dto.response.AiRouterSettingsResponse;
import com.uav.platform.dto.response.AiRouterStatusResponse;
import com.uav.platform.dto.response.AssistantChatResponse;
import com.uav.platform.dto.response.AssistantInfoResponse;

import org.springframework.security.core.Authentication;

/** Admin management of the 9router gateway and the assistant chat that runs through it. */
public interface AiRouterService {
    AiRouterSettingsResponse settings();

    AiRouterSettingsResponse update(AiRouterSettingsRequest request, Authentication auth);

    AiRouterStatusResponse status();

    AssistantInfoResponse info();

    AssistantChatResponse chat(AssistantChatRequest request, Authentication auth);
}
