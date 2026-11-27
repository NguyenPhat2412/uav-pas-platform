package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.AssistantAttachment;

import java.util.Collection;
import java.util.List;

public interface IAssistantAttachmentDao extends IGenericDao<Long, AssistantAttachment> {
    List<AssistantAttachment> findByMessageIdInOrderByIdAsc(Collection<Long> messageIds);
}
