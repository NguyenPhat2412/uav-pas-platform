package com.uav.platform.dao.impl.support;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.support.ISupportMessageDao;
import com.uav.platform.entity.support.SupportMessage;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

@Repository
public class SupportMessageDaoImpl extends HibernateGenericDao<Long, SupportMessage>
        implements ISupportMessageDao {

    private static final Logger logger = LoggerFactory.getLogger(SupportMessageDaoImpl.class);

    public SupportMessageDaoImpl(final EntityManager entityManager) {
        super(SupportMessage.class, entityManager);
    }

    @Override
    public List<SupportMessage> findByThreadIdOrderByCreatedAtAscIdAsc(Long threadId) {
        return hql("select e from SupportMessage e where e.threadId = :threadId order by e.createdAt asc, e.id asc")
                .setParameter("threadId", threadId)
                .getResultList();
    }

    @Override
    public List<SupportMessage> findBySenderRoleAndDeliveredAtIsNull(String senderRole) {
        return hql("select e from SupportMessage e where e.senderRole = :senderRole and e.deliveredAt is null")
                .setParameter("senderRole", senderRole)
                .getResultList();
    }

    @Override
    public long countByThreadId(Long threadId) {
        Long v =
                hql(
                                "select count(e) from SupportMessage e where e.threadId = :threadId",
                                Long.class)
                        .setParameter("threadId", threadId)
                        .getSingleResult();
        return v == null ? 0L : v;
    }

    @Override
    public List<Object[]> countGroupedByThreadIds(Collection<Long> threadIds) {
        if (isEmpty(threadIds)) return List.of();
        return hql(
                        "select m.threadId, count(m) from SupportMessage m where m.threadId in :threadIds group by m.threadId",
                        Object[].class)
                .setParameter("threadIds", threadIds)
                .getResultList();
    }

    @Override
    @Transactional
    public void deleteByThreadId(Long threadId) {
        hqlMutation("delete from SupportMessage e where e.threadId = :threadId")
                .setParameter("threadId", threadId)
                .executeUpdate();
    }
}
