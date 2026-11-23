package com.uav.platform.dao.marketplace;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.marketplace.ProviderPilot;

import java.util.List;
import java.util.Optional;

public interface IProviderPilotDao extends IGenericDao<Long, ProviderPilot> {
    List<ProviderPilot> findByProviderIdAndDeletedFalseOrderByCreatedAtDesc(Long providerId);

    Optional<ProviderPilot> findByIdAndProviderIdAndDeletedFalse(Long id, Long providerId);

    List<ProviderPilot> findByPilotUserIdAndDeletedFalse(Long pilotUserId);
}
