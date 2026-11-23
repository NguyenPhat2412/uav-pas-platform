package com.uav.platform.dao.marketplace;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.marketplace.MarketplaceListing;
import com.uav.platform.enums.marketplace.ListingModerationStatus;

import java.util.List;
import java.util.Optional;

public interface IMarketplaceListingDao extends IGenericDao<Long, MarketplaceListing> {
    Optional<MarketplaceListing> findBySlug(String slug);

    Optional<MarketplaceListing> findWithDetailsById(Long id);

    List<MarketplaceListing> findByProviderIdOrderByCreatedAtDesc(Long providerId);

    List<MarketplaceListing> findByProviderIdAndModerationStatusOrderByFeaturedDescCreatedAtDesc(
            Long providerId, ListingModerationStatus status);

    boolean existsBySlug(String slug);
}
