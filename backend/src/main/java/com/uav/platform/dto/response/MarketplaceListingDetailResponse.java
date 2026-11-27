package com.uav.platform.dto.response;

import java.util.List;

public record MarketplaceListingDetailResponse(
        MarketplaceListingResponse listing, List<MarketplaceReviewResponse> reviews) {}
