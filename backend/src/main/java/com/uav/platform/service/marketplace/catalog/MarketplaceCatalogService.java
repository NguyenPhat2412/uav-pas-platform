package com.uav.platform.service.marketplace.catalog;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingDetailResponse;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingResponse;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceStorefrontResponse;
import com.uav.platform.enums.marketplace.ListingType;
import com.uav.platform.enums.marketplace.PricingModel;
import com.uav.platform.enums.mission.MissionType;

import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;

public interface MarketplaceCatalogService {

    default PageResponse<MarketplaceListingResponse> listPublicListings(
            String keyword,
            ListingType listingType,
            MissionType missionType,
            PricingModel pricingModel,
            String province,
            BigDecimal maxPriceVnd,
            Long categoryServiceId,
            Pageable pageable) {
        return listPublicListings(
                keyword,
                null,
                listingType,
                missionType,
                pricingModel,
                province,
                maxPriceVnd,
                categoryServiceId,
                pageable);
    }

    PageResponse<MarketplaceListingResponse> listPublicListings(
            String keyword,
            String category,
            ListingType listingType,
            MissionType missionType,
            PricingModel pricingModel,
            String province,
            BigDecimal maxPriceVnd,
            Long categoryServiceId,
            Pageable pageable);

    MarketplaceListingDetailResponse getPublicListingBySlug(String slug);

    MarketplaceStorefrontResponse getPublicStorefrontBySlug(String slug);
}
