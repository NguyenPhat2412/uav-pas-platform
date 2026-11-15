package com.uav.platform.dto.response.marketplace.catalog;

import java.util.List;

public record MarketplaceListingDetailResponse(
        MarketplaceListingResponse listing, List<MarketplaceReviewResponse> reviews) {}
