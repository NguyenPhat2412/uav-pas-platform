package com.uav.platform.dao.impl;

import com.uav.platform.dao.IProviderDocumentDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.ProviderDocument;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public class ProviderDocumentDaoImpl extends HibernateGenericDao<Long, ProviderDocument>
        implements IProviderDocumentDao {

    private static final Logger logger = LoggerFactory.getLogger(ProviderDocumentDaoImpl.class);

    public ProviderDocumentDaoImpl(final EntityManager entityManager) {
        super(ProviderDocument.class, entityManager);
    }

    @Override
    public List<ProviderDocument> findByProviderIdOrderByCreatedAtDesc(Long providerId) {
        return hql("select e from ProviderDocument e left join fetch e.mediaAsset where e.provider.id = :providerId order by e.createdAt desc")
                .setParameter("providerId", providerId)
                .getResultList();
    }

    @Override
    public List<ProviderDocument> findByProviderIdInOrderByCreatedAtDesc(
            Collection<Long> providerIds) {
        if (isEmpty(providerIds)) return List.of();
        return hql("select e from ProviderDocument e left join fetch e.mediaAsset where e.provider.id in :providerIds order by e.createdAt desc")
                .setParameter("providerIds", providerIds)
                .getResultList();
    }

    @Override
    public Optional<ProviderDocument> findByIdAndProviderId(Long id, Long providerId) {
        return hql("select e from ProviderDocument e left join fetch e.mediaAsset where e.id = :id and e.provider.id = :providerId")
                .setParameter("id", id)
                .setParameter("providerId", providerId)
                .uniqueResultOptional();
    }
}
