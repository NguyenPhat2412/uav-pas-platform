package com.uav.platform.dao.impl;

import com.uav.platform.dao.IMarketplaceListingDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.MarketplaceListing;
import com.uav.platform.enums.ListingModerationStatus;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class MarketplaceListingDaoImpl extends HibernateGenericDao<Long, MarketplaceListing>
        implements IMarketplaceListingDao {

    private static final Logger logger = LoggerFactory.getLogger(MarketplaceListingDaoImpl.class);

    public MarketplaceListingDaoImpl(final EntityManager entityManager) {
        super(MarketplaceListing.class, entityManager);
    }

    @Override
    public Page<MarketplaceListing> findAll(
            HibernateSpecification<MarketplaceListing> spec, Pageable pageable) {
        return findAllWithGraph(spec, pageable, "provider", "categoryService");
    }

    @Override
    public Optional<MarketplaceListing> findBySlug(String slug) {
        return withEntityGraph(
                        hql("select e from MarketplaceListing e where e.slug = :slug")
                                .setParameter("slug", slug),
                        "provider",
                        "categoryService")
                .uniqueResultOptional();
    }

    @Override
    public Optional<MarketplaceListing> findWithDetailsById(Long id) {
        return withEntityGraph(
                        hql("select e from MarketplaceListing e where e.id = :id")
                                .setParameter("id", id),
                        "provider",
                        "categoryService")
                .uniqueResultOptional();
    }

    @Override
    public List<MarketplaceListing> findByProviderIdOrderByCreatedAtDesc(Long providerId) {
        return withEntityGraph(
                        hql("select e from MarketplaceListing e where e.provider.id = :providerId order by e.createdAt desc")
                                .setParameter("providerId", providerId),
                        "provider",
                        "categoryService")
                .getResultList();
    }

    @Override
    public List<MarketplaceListing>
            findByProviderIdAndModerationStatusOrderByFeaturedDescCreatedAtDesc(
                    Long providerId, ListingModerationStatus status) {
        return withEntityGraph(
                        hql("select e from MarketplaceListing e where e.provider.id = :providerId and e.moderationStatus = :status order by e.featured desc, e.createdAt desc")
                                .setParameter("providerId", providerId)
                                .setParameter("status", status),
                        "provider",
                        "categoryService")
                .getResultList();
    }

    @Override
    public boolean existsBySlug(String slug) {
        return !hql("select 1 from MarketplaceListing e where e.slug = :slug", Integer.class)
                .setParameter("slug", slug)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }
}
