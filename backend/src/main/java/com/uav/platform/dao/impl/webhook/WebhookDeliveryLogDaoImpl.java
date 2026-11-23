package com.uav.platform.dao.impl.webhook;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.webhook.IWebhookDeliveryLogDao;
import com.uav.platform.entity.webhook.WebhookDeliveryLog;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.hibernate.query.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public class WebhookDeliveryLogDaoImpl extends HibernateGenericDao<Long, WebhookDeliveryLog>
        implements IWebhookDeliveryLogDao {

    private static final Logger logger = LoggerFactory.getLogger(WebhookDeliveryLogDaoImpl.class);

    public WebhookDeliveryLogDaoImpl(final EntityManager entityManager) {
        super(WebhookDeliveryLog.class, entityManager);
    }

    @Override
    public java.util.Optional<Long> subscriptionIdForDelivery(Long id) {
        return hql("select d.subscription.id from WebhookDeliveryLog d where d.id=:id", Long.class)
                .setParameter("id", id)
                .uniqueResultOptional();
    }

    @Override
    @Transactional
    public int cancelPendingForSubscription(Long subscriptionId) {
        return hqlMutation(
                        "update WebhookDeliveryLog d set d.deliveryStatus='CANCELLED', d.responseBody='DESTINATION_REMOVED' where d.subscription.id=:subscriptionId and d.deliveryStatus in ('QUEUED','RETRYING','UNCONFIGURED')")
                .setParameter("subscriptionId", subscriptionId)
                .executeUpdate();
    }

    @Override
    @Transactional
    public int requeueUnconfigured(Long subscriptionId, java.time.LocalDateTime now) {
        return hqlMutation(
                        "update WebhookDeliveryLog d set d.deliveryStatus='QUEUED', d.nextAttemptAt=:now where d.subscription.id=:subscriptionId and d.deliveryStatus='UNCONFIGURED'")
                .setParameter("subscriptionId", subscriptionId)
                .setParameter("now", now)
                .executeUpdate();
    }

    @Override
    public boolean existsByEventIdAndSubscriptionId(String eventId, Long subscriptionId) {
        return !hql(
                        "select 1 from WebhookDeliveryLog e where e.eventId = :eventId and e.subscription.id = :subscriptionId",
                        Integer.class)
                .setParameter("eventId", eventId)
                .setParameter("subscriptionId", subscriptionId)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public List<Long> dueIds(java.time.LocalDateTime now, Pageable pageable) {
        Query<Long> q =
                hql(
                                "select d.id from WebhookDeliveryLog d where d.deliveryStatus in ('QUEUED','RETRYING') and d.nextAttemptAt<=:now order by d.nextAttemptAt,d.id",
                                Long.class)
                        .setParameter("now", now);
        if (pageable != null && pageable.isPaged()) {
            q.setFirstResult((int) pageable.getOffset());
            q.setMaxResults(pageable.getPageSize());
        }
        return q.getResultList();
    }

    @Override
    public java.util.Optional<WebhookDeliveryLog> findByIdForUpdate(Long id) {
        return hql("select d from WebhookDeliveryLog d where d.id=:id", WebhookDeliveryLog.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }

    @Override
    public List<WebhookDeliveryLog> findBySubscriptionIdOrderByAttemptedAtDesc(
            Long subscriptionId) {
        return hql("select e from WebhookDeliveryLog e where e.subscription.id = :subscriptionId order by e.attemptedAt desc")
                .setParameter("subscriptionId", subscriptionId)
                .getResultList();
    }

    @Override
    public Page<WebhookDeliveryLog> findAllByOrderByAttemptedAtDesc(Pageable pageable) {
        String effectiveHql =
                appendPageableSort(
                        "select e from WebhookDeliveryLog e order by e.attemptedAt desc", pageable);
        Query<WebhookDeliveryLog> q = hql(effectiveHql);
        if (pageable != null && pageable.isPaged()) {
            q.setFirstResult((int) pageable.getOffset());
            q.setMaxResults(pageable.getPageSize());
        }
        List<WebhookDeliveryLog> content = q.getResultList();
        if (pageable == null || pageable.isUnpaged()) {
            return new PageImpl<>(content);
        }
        Long total = hql("select count(e) from WebhookDeliveryLog e", Long.class).getSingleResult();
        return new PageImpl<>(content, pageable, total == null ? 0L : total);
    }
}
