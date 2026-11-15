package com.uav.platform.repository.marketplace;

import com.uav.platform.entity.marketplace.ProviderDocument;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;

public interface ProviderDocumentRepository
        extends JpaRepository<ProviderDocument, Long>, JpaSpecificationExecutor<ProviderDocument> {

    List<ProviderDocument> findByProviderIdOrderByCreatedAtDesc(Long providerId);

    List<ProviderDocument> findByProviderIdInOrderByCreatedAtDesc(Collection<Long> providerIds);
}
