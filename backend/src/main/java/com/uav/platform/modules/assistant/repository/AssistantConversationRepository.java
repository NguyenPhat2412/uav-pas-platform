package com.uav.platform.modules.assistant.repository;

import com.uav.platform.modules.assistant.entity.AssistantConversation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AssistantConversationRepository
        extends JpaRepository<AssistantConversation, Long>,
                JpaSpecificationExecutor<AssistantConversation> {}
