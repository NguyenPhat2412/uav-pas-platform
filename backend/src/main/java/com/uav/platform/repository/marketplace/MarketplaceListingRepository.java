package com.uav.platform.repository.marketplace;

import com.uav.platform.entity.marketplace.MarketplaceListing;
import com.uav.platform.enums.marketplace.ListingModerationStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface MarketplaceListingRepository
        extends JpaRepository<MarketplaceListing, Long>,
                JpaSpecificationExecutor<MarketplaceListing> {

    @Override
    @EntityGraph(attributePaths = {"provider", "categoryService"})
    Page<MarketplaceListing> findAll(Specification<MarketplaceListing> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"provider", "categoryService"})
    Optional<MarketplaceListing> findBySlug(String slug);

    @EntityGraph(attributePaths = {"provider", "categoryService"})
    Optional<MarketplaceListing> findWithDetailsById(Long id);

    @EntityGraph(attributePaths = {"provider", "categoryService"})
    List<MarketplaceListing> findByProviderIdOrderByCreatedAtDesc(Long providerId);

    @EntityGraph(attributePaths = {"provider", "categoryService"})
    List<MarketplaceListing> findByProviderIdAndModerationStatusOrderByFeaturedDescCreatedAtDesc(
            Long providerId, ListingModerationStatus status);

    boolean existsBySlug(String slug);
}
