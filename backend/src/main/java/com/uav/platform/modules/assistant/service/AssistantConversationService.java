package com.uav.platform.modules.assistant.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.assistant.dto.record.ChatImage;
import com.uav.platform.modules.assistant.dto.record.ChatThread;
import com.uav.platform.modules.assistant.dto.response.AssistantChatResponse;
import com.uav.platform.modules.assistant.dto.response.AssistantConversationDetailResponse;
import com.uav.platform.modules.assistant.dto.response.AssistantConversationResponse;

import org.springframework.security.core.Authentication;

import java.util.List;

/** Stores assistant chats from every portal and lets administrators review and remove them. */
public interface AssistantConversationService {
    /** Opens or continues the caller's thread and stores their question (and its images) before the model is asked. */
    ChatThread begin(Authentication auth, String requestedPortal, Long conversationId, String question, List<ChatImage> images);

    void recordReply(Long conversationId, AssistantChatResponse reply);

    PageResponse<AssistantConversationResponse> list(String portal, String query, int page, int size);

    AssistantConversationDetailResponse detail(Long id);

    void delete(Long id, Authentication auth);
}
