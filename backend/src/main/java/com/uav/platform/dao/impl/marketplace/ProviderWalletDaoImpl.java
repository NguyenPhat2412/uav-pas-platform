package com.uav.platform.dao.impl.marketplace;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.marketplace.IProviderWalletDao;
import com.uav.platform.entity.marketplace.ProviderWallet;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class ProviderWalletDaoImpl extends HibernateGenericDao<Long, ProviderWallet>
        implements IProviderWalletDao {

    private static final Logger logger = LoggerFactory.getLogger(ProviderWalletDaoImpl.class);

    public ProviderWalletDaoImpl(final EntityManager entityManager) {
        super(ProviderWallet.class, entityManager);
    }

    @Override
    public Optional<ProviderWallet> findByProviderId(Long providerId) {
        return hql("select e from ProviderWallet e where e.provider.id = :providerId")
                .setParameter("providerId", providerId)
                .uniqueResultOptional();
    }

    @Override
    public Optional<ProviderWallet> findByProviderIdForUpdate(Long providerId) {
        return hql(
                        "select w from ProviderWallet w where w.provider.id = :providerId",
                        ProviderWallet.class)
                .setParameter("providerId", providerId)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }
}
