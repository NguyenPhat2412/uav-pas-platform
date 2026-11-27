package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.WalletTransaction;

import java.util.List;

public interface IWalletTransactionDao extends IGenericDao<Long, WalletTransaction> {
    List<WalletTransaction> findTop50ByWalletIdOrderByCreatedAtDescIdDesc(Long walletId);
}
