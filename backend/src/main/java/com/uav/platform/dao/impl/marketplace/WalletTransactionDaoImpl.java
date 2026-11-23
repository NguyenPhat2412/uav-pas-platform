package com.uav.platform.dao.impl.marketplace;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.marketplace.IWalletTransactionDao;
import com.uav.platform.entity.marketplace.WalletTransaction;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class WalletTransactionDaoImpl extends HibernateGenericDao<Long, WalletTransaction>
        implements IWalletTransactionDao {

    private static final Logger logger = LoggerFactory.getLogger(WalletTransactionDaoImpl.class);

    public WalletTransactionDaoImpl(final EntityManager entityManager) {
        super(WalletTransaction.class, entityManager);
    }

    @Override
    public List<WalletTransaction> findTop50ByWalletIdOrderByCreatedAtDescIdDesc(Long walletId) {
        return hql("select e from WalletTransaction e where e.wallet.id = :walletId order by e.createdAt desc, e.id desc")
                .setParameter("walletId", walletId)
                .setMaxResults(50)
                .getResultList();
    }
}
