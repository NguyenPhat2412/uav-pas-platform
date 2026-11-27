package com.uav.platform.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.response.MarketplaceListingDetailResponse;
import com.uav.platform.dto.response.MarketplaceListingResponse;
import com.uav.platform.dto.response.MarketplaceStorefrontResponse;
import com.uav.platform.enums.ListingType;
import com.uav.platform.enums.MissionType;
import com.uav.platform.enums.PricingModel;

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
