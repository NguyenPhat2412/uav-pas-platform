package com.uav.platform.dao.marketplace;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.marketplace.ProviderDocument;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface IProviderDocumentDao extends IGenericDao<Long, ProviderDocument> {
    List<ProviderDocument> findByProviderIdOrderByCreatedAtDesc(Long providerId);

    List<ProviderDocument> findByProviderIdInOrderByCreatedAtDesc(Collection<Long> providerIds);

    Optional<ProviderDocument> findByIdAndProviderId(Long id, Long providerId);
}
