package com.uav.platform.dao.marketplace;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.marketplace.ProviderWallet;

import java.util.Optional;

public interface IProviderWalletDao extends IGenericDao<Long, ProviderWallet> {
    Optional<ProviderWallet> findByProviderId(Long providerId);

    Optional<ProviderWallet> findByProviderIdForUpdate(Long providerId);
}
