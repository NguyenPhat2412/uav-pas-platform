package com.uav.platform.dao.assistant;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.assistant.AssistantMessage;

import java.util.List;

public interface IAssistantMessageDao extends IGenericDao<Long, AssistantMessage> {
    List<AssistantMessage> findByConversationIdOrderByIdAsc(Long conversationId);
}
