package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.AssistantMessage;

import java.util.List;

public interface IAssistantMessageDao extends IGenericDao<Long, AssistantMessage> {
    List<AssistantMessage> findByConversationIdOrderByIdAsc(Long conversationId);
}
