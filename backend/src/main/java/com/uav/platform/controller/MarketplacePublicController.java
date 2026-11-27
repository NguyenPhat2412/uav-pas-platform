package com.uav.platform.controller;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.config.ApiRoutes;
import com.uav.platform.dto.response.MarketplaceListingDetailResponse;
import com.uav.platform.dto.response.MarketplaceListingResponse;
import com.uav.platform.dto.response.MarketplaceStorefrontResponse;
import com.uav.platform.enums.ListingType;
import com.uav.platform.enums.MissionType;
import com.uav.platform.enums.PricingModel;
import com.uav.platform.service.MarketplaceCatalogService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping(ApiRoutes.Marketplace.PUBLIC_BASE)
@RequiredArgsConstructor
public class MarketplacePublicController {

    private final MarketplaceCatalogService catalogService;

    @GetMapping(ApiRoutes.Marketplace.PUBLIC_LISTINGS)
    public ResponseEntity<PageResponse<MarketplaceListingResponse>> listListings(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) ListingType listingType,
            @RequestParam(required = false) MissionType missionType,
            @RequestParam(required = false) PricingModel pricingModel,
            @RequestParam(required = false) String province,
            @RequestParam(required = false) BigDecimal maxPriceVnd,
            @RequestParam(required = false) Long categoryServiceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        String effectiveKeyword = (q != null && !q.isBlank()) ? q : keyword;
        return ResponseEntity.ok(
                catalogService.listPublicListings(
                        effectiveKeyword,
                        category,
                        listingType,
                        missionType,
                        pricingModel,
                        province,
                        maxPriceVnd,
                        categoryServiceId,
                        PageRequest.of(Math.max(0, page), Math.min(Math.max(size, 1), 50))));
    }

    @GetMapping(ApiRoutes.Marketplace.PUBLIC_LISTING_BY_SLUG)
    public ResponseEntity<MarketplaceListingDetailResponse> getListing(@PathVariable String slug) {
        return ResponseEntity.ok(catalogService.getPublicListingBySlug(slug));
    }

    @GetMapping(ApiRoutes.Marketplace.PUBLIC_PROVIDER_BY_SLUG)
    public ResponseEntity<MarketplaceStorefrontResponse> getStorefront(@PathVariable String slug) {
        return ResponseEntity.ok(catalogService.getPublicStorefrontBySlug(slug));
    }
}
