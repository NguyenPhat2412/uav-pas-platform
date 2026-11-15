package com.uav.platform.dto.response.marketplace.catalog;

import com.uav.platform.dto.response.marketplace.provider.ProviderProfileResponse;

import java.util.List;

public record MarketplaceStorefrontResponse(
        ProviderProfileResponse provider,
        List<MarketplaceListingResponse> listings,
        List<MarketplaceReviewResponse> reviews) {}
