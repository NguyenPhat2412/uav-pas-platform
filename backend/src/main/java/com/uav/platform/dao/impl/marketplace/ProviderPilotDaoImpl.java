package com.uav.platform.dao.impl.marketplace;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.marketplace.IProviderPilotDao;
import com.uav.platform.entity.marketplace.ProviderPilot;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class ProviderPilotDaoImpl extends HibernateGenericDao<Long, ProviderPilot>
        implements IProviderPilotDao {

    private static final Logger logger = LoggerFactory.getLogger(ProviderPilotDaoImpl.class);

    public ProviderPilotDaoImpl(final EntityManager entityManager) {
        super(ProviderPilot.class, entityManager);
    }

    @Override
    public List<ProviderPilot> findByProviderIdAndDeletedFalseOrderByCreatedAtDesc(
            Long providerId) {
        return withEntityGraph(
                        hql("select e from ProviderPilot e where e.provider.id = :providerId and e.deleted = false order by e.createdAt desc")
                                .setParameter("providerId", providerId),
                        "pilotUser",
                        "assignedUav")
                .getResultList();
    }

    @Override
    public Optional<ProviderPilot> findByIdAndProviderIdAndDeletedFalse(Long id, Long providerId) {
        return withEntityGraph(
                        hql("select e from ProviderPilot e where e.id = :id and e.provider.id = :providerId and e.deleted = false")
                                .setParameter("id", id)
                                .setParameter("providerId", providerId),
                        "pilotUser",
                        "assignedUav",
                        "provider")
                .uniqueResultOptional();
    }

    @Override
    public List<ProviderPilot> findByPilotUserIdAndDeletedFalse(Long pilotUserId) {
        return hql("select e from ProviderPilot e where e.pilotUser.id = :pilotUserId and e.deleted = false")
                .setParameter("pilotUserId", pilotUserId)
                .getResultList();
    }
}
