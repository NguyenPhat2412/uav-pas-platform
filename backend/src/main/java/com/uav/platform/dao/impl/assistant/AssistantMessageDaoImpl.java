package com.uav.platform.dao.impl.assistant;

import com.uav.platform.dao.assistant.IAssistantMessageDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.assistant.AssistantMessage;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class AssistantMessageDaoImpl extends HibernateGenericDao<Long, AssistantMessage>
        implements IAssistantMessageDao {

    private static final Logger logger = LoggerFactory.getLogger(AssistantMessageDaoImpl.class);

    public AssistantMessageDaoImpl(final EntityManager entityManager) {
        super(AssistantMessage.class, entityManager);
    }

    @Override
    public List<AssistantMessage> findByConversationIdOrderByIdAsc(Long conversationId) {
        return hql("select e from AssistantMessage e where e.conversationId = :conversationId order by e.id asc")
                .setParameter("conversationId", conversationId)
                .getResultList();
    }
}
