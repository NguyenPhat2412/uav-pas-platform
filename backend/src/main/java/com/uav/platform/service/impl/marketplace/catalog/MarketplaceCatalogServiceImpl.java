package com.uav.platform.service.impl.marketplace.catalog;

import static com.uav.platform.specification.marketplace.catalog.MarketplaceSpecifications.*;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingDetailResponse;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingResponse;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceStorefrontResponse;
import com.uav.platform.entity.marketplace.MarketplaceListing;
import com.uav.platform.entity.marketplace.ProviderProfile;
import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.ListingType;
import com.uav.platform.enums.marketplace.PricingModel;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.marketplace.provider.MarketplaceMapper;
import com.uav.platform.repository.marketplace.MarketplaceListingRepository;
import com.uav.platform.repository.marketplace.ProviderDocumentRepository;
import com.uav.platform.repository.marketplace.ProviderProfileRepository;
import com.uav.platform.repository.mission.MissionReviewRepository;
import com.uav.platform.service.marketplace.catalog.MarketplaceCatalogService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarketplaceCatalogServiceImpl implements MarketplaceCatalogService {

    private final MarketplaceListingRepository listings;
    private final ProviderProfileRepository providers;
    private final ProviderDocumentRepository documents;
    private final MissionReviewRepository reviews;
    private final MarketplaceMapper mapper;

    @Override
    public PageResponse<MarketplaceListingResponse> listPublicListings(
            String keyword,
            ListingType listingType,
            MissionType missionType,
            PricingModel pricingModel,
            String province,
            BigDecimal maxPriceVnd,
            Long categoryServiceId,
            Pageable pageable) {
        Specification<MarketplaceListing> spec =
                Specification.allOf(
                        listingModerationStatus(ListingModerationStatus.PUBLISHED),
                        listingKeyword(keyword),
                        listingType(listingType),
                        listingMissionType(missionType),
                        listingPricingModel(pricingModel),
                        listingProvince(province),
                        listingMaxPrice(maxPriceVnd),
                        listingCategoryService(categoryServiceId));
        Pageable sorted =
                PageRequest.of(
                        pageable.getPageNumber(),
                        Math.min(Math.max(pageable.getPageSize(), 1), 50),
                        Sort.by(
                                Sort.Order.desc("featured"),
                                Sort.Order.desc("ratingAvg"),
                                Sort.Order.desc("bookingCount"),
                                Sort.Order.desc("id")));
        return PageResponse.from(listings.findAll(spec, sorted), mapper::toListingResponse);
    }

    @Override
    public MarketplaceListingDetailResponse getPublicListingBySlug(String slug) {
        MarketplaceListing listing =
                listings.findBySlug(slug)
                        .filter(l -> l.getModerationStatus() == ListingModerationStatus.PUBLISHED)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy dịch vụ trên sàn.",
                                                "LISTING_NOT_FOUND"));
        var recentReviews =
                reviews
                        .findTop20ByMissionListingIdOrderByUpdatedAtDescIdDesc(listing.getId())
                        .stream()
                        .map(mapper::toReviewResponse)
                        .toList();
        return new MarketplaceListingDetailResponse(
                mapper.toListingResponse(listing), recentReviews);
    }

    @Override
    public MarketplaceStorefrontResponse getPublicStorefrontBySlug(String slug) {
        ProviderProfile provider =
                providers
                        .findBySlug(slug)
                        .filter(
                                p ->
                                        p.getVerificationStatus()
                                                == ProviderVerificationStatus.VERIFIED)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy gian hàng đối tác đã xác minh.",
                                                "PROVIDER_NOT_FOUND"));
        var publishedListings =
                listings
                        .findByProviderIdAndModerationStatusOrderByFeaturedDescCreatedAtDesc(
                                provider.getId(), ListingModerationStatus.PUBLISHED)
                        .stream()
                        .map(mapper::toListingResponse)
                        .toList();
        var recentReviews =
                reviews
                        .findTop20ByMissionProviderIdOrderByUpdatedAtDescIdDesc(provider.getId())
                        .stream()
                        .map(mapper::toReviewResponse)
                        .toList();
        // Public storefront never exposes sensitive KYC document files.
        return new MarketplaceStorefrontResponse(
                mapper.toProfileResponse(provider, java.util.List.of()),
                publishedListings,
                recentReviews);
    }
}
