package com.uav.platform.dao.impl.support;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.support.ISupportQuickReplyDao;
import com.uav.platform.entity.support.SupportQuickReply;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class SupportQuickReplyDaoImpl extends HibernateGenericDao<Long, SupportQuickReply>
        implements ISupportQuickReplyDao {

    private static final Logger logger = LoggerFactory.getLogger(SupportQuickReplyDaoImpl.class);

    public SupportQuickReplyDaoImpl(final EntityManager entityManager) {
        super(SupportQuickReply.class, entityManager);
    }

    @Override
    public List<SupportQuickReply> findAllByOrderBySortOrderAscIdAsc() {
        return hql("select e from SupportQuickReply e order by e.sortOrder asc, e.id asc")
                .getResultList();
    }
}
