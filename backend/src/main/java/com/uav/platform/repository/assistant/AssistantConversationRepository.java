package com.uav.platform.repository.assistant;

import com.uav.platform.entity.assistant.AssistantConversation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssistantConversationRepository
        extends JpaRepository<AssistantConversation, Long>,
                JpaSpecificationExecutor<AssistantConversation> {}
