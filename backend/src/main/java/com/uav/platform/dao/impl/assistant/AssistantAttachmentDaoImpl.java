package com.uav.platform.dao.impl.assistant;

import com.uav.platform.dao.assistant.IAssistantAttachmentDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.assistant.AssistantAttachment;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public class AssistantAttachmentDaoImpl extends HibernateGenericDao<Long, AssistantAttachment>
        implements IAssistantAttachmentDao {

    private static final Logger logger = LoggerFactory.getLogger(AssistantAttachmentDaoImpl.class);

    public AssistantAttachmentDaoImpl(final EntityManager entityManager) {
        super(AssistantAttachment.class, entityManager);
    }

    @Override
    public List<AssistantAttachment> findByMessageIdInOrderByIdAsc(Collection<Long> messageIds) {
        if (isEmpty(messageIds)) return List.of();
        return hql("select e from AssistantAttachment e where e.messageId in :messageIds order by e.id asc")
                .setParameter("messageIds", messageIds)
                .getResultList();
    }
}
