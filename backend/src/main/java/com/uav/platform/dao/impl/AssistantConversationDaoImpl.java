package com.uav.platform.dao.impl;

import com.uav.platform.dao.IAssistantConversationDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.AssistantConversation;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

@Repository
public class AssistantConversationDaoImpl extends HibernateGenericDao<Long, AssistantConversation>
        implements IAssistantConversationDao {

    private static final Logger logger =
            LoggerFactory.getLogger(AssistantConversationDaoImpl.class);

    public AssistantConversationDaoImpl(final EntityManager entityManager) {
        super(AssistantConversation.class, entityManager);
    }
}
