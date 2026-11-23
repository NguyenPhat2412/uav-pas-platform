package com.uav.platform.dao.impl.webhook;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.webhook.IWebhookSubscriptionDao;
import com.uav.platform.entity.webhook.WebhookSubscription;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class WebhookSubscriptionDaoImpl extends HibernateGenericDao<Long, WebhookSubscription>
        implements IWebhookSubscriptionDao {

    private static final Logger logger = LoggerFactory.getLogger(WebhookSubscriptionDaoImpl.class);

    public WebhookSubscriptionDaoImpl(final EntityManager entityManager) {
        super(WebhookSubscription.class, entityManager);
    }

    @Override
    public List<WebhookSubscription> findByIsActiveTrue() {
        return hql("select e from WebhookSubscription e where e.isActive = true").getResultList();
    }

    @Override
    public java.util.Optional<WebhookSubscription> findByIdForUpdate(Long id) {
        return hql("select s from WebhookSubscription s where s.id=:id", WebhookSubscription.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }

    @Override
    public List<WebhookSubscription> findActiveSubscribersForEvent(String eventType) {
        return hql(
                        "SELECT s FROM WebhookSubscription s WHERE s.deletedAt IS NULL AND s.isActive = true AND s.eventsSubscribed LIKE concat('%', :eventType, '%') ORDER BY s.id",
                        WebhookSubscription.class)
                .setParameter("eventType", eventType)
                .setLockMode(LockModeType.PESSIMISTIC_READ)
                .getResultList();
    }
}
