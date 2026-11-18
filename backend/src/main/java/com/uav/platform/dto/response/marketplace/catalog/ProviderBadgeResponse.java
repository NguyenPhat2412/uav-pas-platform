package com.uav.platform.dto.response.marketplace.catalog;

import java.math.BigDecimal;

public record ProviderBadgeResponse(boolean verified, BigDecimal ratingAvg, int reviewCount) {}
