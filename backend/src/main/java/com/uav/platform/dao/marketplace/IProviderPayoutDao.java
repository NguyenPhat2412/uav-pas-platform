package com.uav.platform.dao.marketplace;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.marketplace.ProviderPayout;

import java.util.List;
import java.util.Optional;

public interface IProviderPayoutDao extends IGenericDao<Long, ProviderPayout> {
    List<ProviderPayout> findByProviderIdOrderByCreatedAtDesc(Long providerId);

    Optional<ProviderPayout> findByIdForUpdate(Long id);
}
