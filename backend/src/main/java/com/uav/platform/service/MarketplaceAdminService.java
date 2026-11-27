package com.uav.platform.service;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.request.ListingModerationRequest;
import com.uav.platform.dto.request.PayoutProcessRequest;
import com.uav.platform.dto.request.ProviderDocumentModerationRequest;
import com.uav.platform.dto.request.ProviderModerationRequest;
import com.uav.platform.dto.response.MarketplaceListingResponse;
import com.uav.platform.dto.response.ProviderDocumentResponse;
import com.uav.platform.dto.response.ProviderPayoutResponse;
import com.uav.platform.dto.response.ProviderProfileResponse;
import com.uav.platform.enums.ListingModerationStatus;
import com.uav.platform.enums.PayoutStatus;
import com.uav.platform.enums.ProviderVerificationStatus;

import org.springframework.data.domain.Pageable;

import java.util.List;

public interface MarketplaceAdminService {

    PageResponse<ProviderProfileResponse> listProviders(
            ProviderVerificationStatus status, String keyword, Pageable pageable);

    List<ProviderDocumentResponse> listProviderDocuments(Long providerId);

    ProviderProfileResponse moderateProvider(
            Long providerId, ProviderModerationRequest request, String adminUsername);

    ProviderDocumentResponse moderateProviderDocument(
            Long providerId,
            Long documentId,
            ProviderDocumentModerationRequest request,
            String adminUsername);

    PageResponse<MarketplaceListingResponse> listListings(
            ListingModerationStatus status, String keyword, Pageable pageable);

    MarketplaceListingResponse moderateListing(
            Long listingId, ListingModerationRequest request, String adminUsername);

    PageResponse<ProviderPayoutResponse> listPayouts(PayoutStatus status, Pageable pageable);

    ProviderPayoutResponse processPayout(
            Long payoutId, PayoutProcessRequest request, String adminUsername);
}
