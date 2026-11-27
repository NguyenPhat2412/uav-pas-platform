package com.uav.platform.dao.impl;

import com.uav.platform.dao.IProviderPayoutDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.ProviderPayout;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class ProviderPayoutDaoImpl extends HibernateGenericDao<Long, ProviderPayout>
        implements IProviderPayoutDao {

    private static final Logger logger = LoggerFactory.getLogger(ProviderPayoutDaoImpl.class);

    public ProviderPayoutDaoImpl(final EntityManager entityManager) {
        super(ProviderPayout.class, entityManager);
    }

    @Override
    public Page<ProviderPayout> findAll(
            HibernateSpecification<ProviderPayout> spec, Pageable pageable) {
        return findAllWithGraph(spec, pageable, "provider", "provider.user");
    }

    @Override
    public List<ProviderPayout> findByProviderIdOrderByCreatedAtDesc(Long providerId) {
        return hql("select e from ProviderPayout e where e.provider.id = :providerId order by e.createdAt desc")
                .setParameter("providerId", providerId)
                .getResultList();
    }

    @Override
    public Optional<ProviderPayout> findByIdForUpdate(Long id) {
        return hql(
                        "select p from ProviderPayout p join fetch p.provider where p.id = :id",
                        ProviderPayout.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }
}
