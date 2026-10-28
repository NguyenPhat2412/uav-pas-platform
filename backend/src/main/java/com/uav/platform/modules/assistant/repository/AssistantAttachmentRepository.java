package com.uav.platform.modules.assistant.repository;

import com.uav.platform.modules.assistant.entity.AssistantAttachment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;

public interface AssistantAttachmentRepository
        extends JpaRepository<AssistantAttachment, Long>,
                JpaSpecificationExecutor<AssistantAttachment> {
    List<AssistantAttachment> findByMessageIdInOrderByIdAsc(Collection<Long> messageIds);
}
