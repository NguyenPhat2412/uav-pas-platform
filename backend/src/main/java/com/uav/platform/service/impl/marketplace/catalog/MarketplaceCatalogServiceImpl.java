package com.uav.platform.service.impl.marketplace.catalog;

import static com.uav.platform.specification.marketplace.catalog.MarketplaceSpecifications.*;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dao.marketplace.IMarketplaceListingDao;
import com.uav.platform.dao.mission.IMissionReviewDao;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingDetailResponse;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingResponse;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceStorefrontResponse;
import com.uav.platform.entity.marketplace.MarketplaceListing;
import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.ListingType;
import com.uav.platform.enums.marketplace.PricingModel;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.marketplace.provider.MarketplaceMapper;
import com.uav.platform.service.marketplace.catalog.MarketplaceCatalogService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarketplaceCatalogServiceImpl implements MarketplaceCatalogService {

    private final IMarketplaceListingDao listings;
    private final IMissionReviewDao reviews;
    private final MarketplaceMapper mapper;

    @Override
    public PageResponse<MarketplaceListingResponse> listPublicListings(
            String keyword,
            String category,
            ListingType listingType,
            MissionType missionType,
            PricingModel pricingModel,
            String province,
            BigDecimal maxPriceVnd,
            Long categoryServiceId,
            Pageable pageable) {
        HibernateSpecification<MarketplaceListing> spec =
                HibernateSpecification.allOf(
                        listingNotDeleted(),
                        listingModerationStatus(ListingModerationStatus.PUBLISHED),
                        listingKeyword(keyword),
                        listingCategory(category),
                        listingType(listingType),
                        listingMissionType(missionType),
                        listingPricingModel(pricingModel),
                        listingProvince(province),
                        listingMaxPrice(maxPriceVnd),
                        listingCategoryService(categoryServiceId));
        Pageable sorted =
                PageRequest.of(
                        Math.max(0, pageable.getPageNumber()),
                        Math.min(Math.max(pageable.getPageSize(), 1), 50),
                        Sort.by(
                                Sort.Order.desc("featured"),
                                Sort.Order.desc("ratingAvg"),
                                Sort.Order.desc("bookingCount"),
                                Sort.Order.desc("id")));
        return PageResponse.from(listings.findAll(spec, sorted), mapper::toPublicListingResponse);
    }

    @Override
    public MarketplaceListingDetailResponse getPublicListingBySlug(String slug) {
        MarketplaceListing listing =
                listings.findBySlug(slug)
                        .filter(l -> !l.isDeleted())
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
                mapper.toPublicListingResponse(listing), recentReviews);
    }

    @Override
    public MarketplaceStorefrontResponse getPublicStorefrontBySlug(String slug) {
        throw SystemException.notFound(
                "Thông tin đội bay được ẩn danh trên sàn dịch vụ UAV PAS.", "PROVIDER_ANONYMIZED");
    }
}
