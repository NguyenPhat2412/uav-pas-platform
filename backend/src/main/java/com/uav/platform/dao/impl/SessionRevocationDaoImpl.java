package com.uav.platform.dao.impl;

import com.uav.platform.dao.ISessionRevocationDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.SessionRevocation;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class SessionRevocationDaoImpl extends HibernateGenericDao<Long, SessionRevocation>
        implements ISessionRevocationDao {

    private static final Logger logger = LoggerFactory.getLogger(SessionRevocationDaoImpl.class);

    public SessionRevocationDaoImpl(final EntityManager entityManager) {
        super(SessionRevocation.class, entityManager);
    }

    @Override
    public List<Long> findAllUserIdsExcept(Long excludedId) {
        return hql("select u.id from AppUser u where u.id <> :excludedId", Long.class)
                .setParameter("excludedId", excludedId)
                .getResultList();
    }
}
