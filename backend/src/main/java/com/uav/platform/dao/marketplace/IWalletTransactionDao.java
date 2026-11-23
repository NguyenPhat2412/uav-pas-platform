package com.uav.platform.dao.marketplace;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.marketplace.WalletTransaction;

import java.util.List;

public interface IWalletTransactionDao extends IGenericDao<Long, WalletTransaction> {
    List<WalletTransaction> findTop50ByWalletIdOrderByCreatedAtDescIdDesc(Long walletId);
}
