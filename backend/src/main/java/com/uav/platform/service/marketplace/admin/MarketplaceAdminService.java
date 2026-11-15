package com.uav.platform.service.marketplace.admin;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.marketplace.admin.ListingModerationRequest;
import com.uav.platform.dto.request.marketplace.admin.ProviderModerationRequest;
import com.uav.platform.dto.request.marketplace.escrow.PayoutProcessRequest;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingResponse;
import com.uav.platform.dto.response.marketplace.escrow.ProviderPayoutResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderProfileResponse;
import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.PayoutStatus;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;

import org.springframework.data.domain.Pageable;

public interface MarketplaceAdminService {

    PageResponse<ProviderProfileResponse> listProviders(
            ProviderVerificationStatus status, String keyword, Pageable pageable);

    ProviderProfileResponse moderateProvider(
            Long providerId, ProviderModerationRequest request, String adminUsername);

    PageResponse<MarketplaceListingResponse> listListings(
            ListingModerationStatus status, String keyword, Pageable pageable);

    MarketplaceListingResponse moderateListing(
            Long listingId, ListingModerationRequest request, String adminUsername);

    PageResponse<ProviderPayoutResponse> listPayouts(PayoutStatus status, Pageable pageable);

    ProviderPayoutResponse processPayout(
            Long payoutId, PayoutProcessRequest request, String adminUsername);
}
