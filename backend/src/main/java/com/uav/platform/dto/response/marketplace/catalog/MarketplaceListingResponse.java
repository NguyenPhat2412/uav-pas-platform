package com.uav.platform.dto.response.marketplace.catalog;

import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.ListingType;
import com.uav.platform.enums.marketplace.PricingModel;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;
import com.uav.platform.enums.mission.MissionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MarketplaceListingResponse(
        Long id,
        Long providerId,
        String providerSlug,
        String providerDisplayName,
        ProviderVerificationStatus providerVerificationStatus,
        boolean officialPlatformListing,
        Long categoryServiceId,
        String categoryServiceCode,
        String categoryServiceName,
        String slug,
        String title,
        String summary,
        String description,
        ListingType listingType,
        MissionType missionType,
        PricingModel pricingModel,
        BigDecimal basePriceVnd,
        BigDecimal minBookingUnits,
        BigDecimal securityDepositVnd,
        String province,
        int serviceRadiusKm,
        String equipmentSpecs,
        String deliverablesSummary,
        String coverImageUrl,
        Integer onSiteSlaHours,
        Integer deliverySlaHours,
        ListingModerationStatus moderationStatus,
        String moderationNote,
        BigDecimal ratingAvg,
        int reviewCount,
        int bookingCount,
        boolean featured,
        LocalDateTime createdAt) {}
