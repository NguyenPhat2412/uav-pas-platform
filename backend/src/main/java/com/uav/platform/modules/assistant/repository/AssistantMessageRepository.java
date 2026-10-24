package com.uav.platform.modules.assistant.repository;

import com.uav.platform.modules.assistant.entity.AssistantMessage;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface AssistantMessageRepository
        extends JpaRepository<AssistantMessage, Long>, JpaSpecificationExecutor<AssistantMessage> {
    List<AssistantMessage> findByConversationIdOrderByIdAsc(Long conversationId);
}
