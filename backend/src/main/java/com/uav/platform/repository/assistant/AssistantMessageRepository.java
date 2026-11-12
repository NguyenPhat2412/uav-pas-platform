package com.uav.platform.repository.assistant;

import com.uav.platform.entity.assistant.AssistantMessage;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface AssistantMessageRepository
        extends JpaRepository<AssistantMessage, Long>, JpaSpecificationExecutor<AssistantMessage> {
    List<AssistantMessage> findByConversationIdOrderByIdAsc(Long conversationId);
}
