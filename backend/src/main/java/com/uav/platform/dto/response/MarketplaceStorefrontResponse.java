package com.uav.platform.dto.response;

import java.util.List;

public record MarketplaceStorefrontResponse(
        ProviderProfileResponse provider,
        List<MarketplaceListingResponse> listings,
        List<MarketplaceReviewResponse> reviews) {}
