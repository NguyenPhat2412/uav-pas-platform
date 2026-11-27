package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.ProviderWallet;

import java.util.Optional;

public interface IProviderWalletDao extends IGenericDao<Long, ProviderWallet> {
    Optional<ProviderWallet> findByProviderId(Long providerId);

    Optional<ProviderWallet> findByProviderIdForUpdate(Long providerId);
}
