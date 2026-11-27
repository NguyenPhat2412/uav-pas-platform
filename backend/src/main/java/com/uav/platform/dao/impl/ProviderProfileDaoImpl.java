package com.uav.platform.dao.impl;

import com.uav.platform.dao.IProviderProfileDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.ProviderProfile;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class ProviderProfileDaoImpl extends HibernateGenericDao<Long, ProviderProfile>
        implements IProviderProfileDao {

    private static final Logger logger = LoggerFactory.getLogger(ProviderProfileDaoImpl.class);

    public ProviderProfileDaoImpl(final EntityManager entityManager) {
        super(ProviderProfile.class, entityManager);
    }

    @Override
    public Optional<ProviderProfile> findByUserId(Long userId) {
        return withEntityGraph(
                        hql("select e from ProviderProfile e where e.user.id = :userId")
                                .setParameter("userId", userId),
                        "user")
                .uniqueResultOptional();
    }

    @Override
    public Optional<ProviderProfile> findByUserUsername(String username) {
        return withEntityGraph(
                        hql("select e from ProviderProfile e where e.user.username = :username")
                                .setParameter("username", username),
                        "user")
                .uniqueResultOptional();
    }

    @Override
    public Optional<ProviderProfile> findBySlug(String slug) {
        return withEntityGraph(
                        hql("select e from ProviderProfile e where e.slug = :slug")
                                .setParameter("slug", slug),
                        "user")
                .uniqueResultOptional();
    }

    @Override
    public boolean existsBySlug(String slug) {
        return !hql("select 1 from ProviderProfile e where e.slug = :slug", Integer.class)
                .setParameter("slug", slug)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }
}
