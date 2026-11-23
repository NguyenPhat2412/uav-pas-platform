package com.uav.platform.dao.impl.notification;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.notification.INotificationDao;
import com.uav.platform.entity.notification.Notification;
import com.uav.platform.enums.notification.NotificationModuleCode;

import jakarta.persistence.EntityManager;

import org.hibernate.query.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public class NotificationDaoImpl extends HibernateGenericDao<Long, Notification>
        implements INotificationDao {

    private static final Logger logger = LoggerFactory.getLogger(NotificationDaoImpl.class);

    public NotificationDaoImpl(final EntityManager entityManager) {
        super(Notification.class, entityManager);
    }

    @Override
    public Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable) {
        String effectiveHql =
                appendPageableSort(
                        "select e from Notification e where e.user.id = :userId order by e.createdAt desc",
                        pageable);
        Query<Notification> q = hql(effectiveHql).setParameter("userId", userId);
        if (pageable != null && pageable.isPaged()) {
            q.setFirstResult((int) pageable.getOffset());
            q.setMaxResults(pageable.getPageSize());
        }
        List<Notification> content = q.getResultList();
        if (pageable == null || pageable.isUnpaged()) {
            return new PageImpl<>(content);
        }
        Long total =
                hql("select count(e) from Notification e where e.user.id = :userId", Long.class)
                        .setParameter("userId", userId)
                        .getSingleResult();
        return new PageImpl<>(content, pageable, total == null ? 0L : total);
    }

    @Override
    public long countByUserIdAndIsReadFalse(Long userId) {
        Long v =
                hql(
                                "select count(e) from Notification e where e.user.id = :userId and e.isRead = false",
                                Long.class)
                        .setParameter("userId", userId)
                        .getSingleResult();
        return v == null ? 0L : v;
    }

    @Override
    public List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId) {
        return hql("select e from Notification e where e.user.id = :userId and e.isRead = false order by e.createdAt desc")
                .setParameter("userId", userId)
                .getResultList();
    }

    @Override
    public boolean existsByUserIdAndModuleCodeAndCreatedAtAfter(
            Long userId, NotificationModuleCode moduleCode, LocalDateTime cutoff) {
        return !hql(
                        "select 1 from Notification e where e.user.id = :userId and e.moduleCode = :moduleCode and e.createdAt > :cutoff",
                        Integer.class)
                .setParameter("userId", userId)
                .setParameter("moduleCode", moduleCode)
                .setParameter("cutoff", cutoff)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    @Transactional
    public void markAllAsReadForUser(Long userId) {
        hqlMutation(
                        "UPDATE Notification n SET n.isRead = true WHERE n.user.id = :userId AND n.isRead = false")
                .setParameter("userId", userId)
                .executeUpdate();
    }
}
