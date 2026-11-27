package com.uav.platform.service;

import com.uav.platform.dto.request.MarketplaceListingUpsertRequest;
import com.uav.platform.dto.request.MissionBidCreateRequest;
import com.uav.platform.dto.request.PayoutCreateRequest;
import com.uav.platform.dto.request.ProviderDocumentCreateRequest;
import com.uav.platform.dto.request.ProviderEquipmentCreateRequest;
import com.uav.platform.dto.request.ProviderOnboardingRequest;
import com.uav.platform.dto.request.ProviderOrderActionRequest;
import com.uav.platform.dto.request.ProviderOrderCompleteRequest;
import com.uav.platform.dto.request.ProviderUavCreateRequest;
import com.uav.platform.dto.response.MarketplaceListingResponse;
import com.uav.platform.dto.response.MissionBidResponse;
import com.uav.platform.dto.response.MissionResponse;
import com.uav.platform.dto.response.ProviderDocumentResponse;
import com.uav.platform.dto.response.ProviderEquipmentResponse;
import com.uav.platform.dto.response.ProviderFleetSummaryResponse;
import com.uav.platform.dto.response.ProviderPayoutResponse;
import com.uav.platform.dto.response.ProviderProfileResponse;
import com.uav.platform.dto.response.ProviderUavResponse;
import com.uav.platform.dto.response.ProviderWalletResponse;

import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

public interface MarketplaceProviderService {

    Optional<ProviderProfileResponse> findMyProfile(String username);

    ProviderProfileResponse upsertMyProfile(ProviderOnboardingRequest request, String username);

    ProviderProfileResponse submitForVerification(String username);

    ProviderDocumentResponse addDocument(ProviderDocumentCreateRequest request, String username);

    void deleteDocument(Long documentId, String username);

    List<MarketplaceListingResponse> listMyListings(String username);

    MarketplaceListingResponse createListing(
            MarketplaceListingUpsertRequest request, String username);

    MarketplaceListingResponse updateListing(
            Long listingId, MarketplaceListingUpsertRequest request, String username);

    MarketplaceListingResponse toggleListingPause(Long listingId, String username);

    ProviderFleetSummaryResponse getMyFleet(String username);

    ProviderUavResponse registerProviderUav(ProviderUavCreateRequest request, String username);

    ProviderEquipmentResponse registerProviderEquipment(
            ProviderEquipmentCreateRequest request, String username);

    List<MissionResponse> listMyOrders(String username);

    MissionResponse respondToOrder(
            Long missionId, ProviderOrderActionRequest request, String username);

    MissionResponse startOrder(Long missionId, String username);

    MissionResponse completeOrder(
            Long missionId, ProviderOrderCompleteRequest request, String username);

    List<MissionResponse> listOpenRfqs(String username);

    MissionBidResponse submitRfqBid(
            Long missionId, MissionBidCreateRequest request, String username);

    List<MissionBidResponse> listMyBids(String username);

    List<MissionBidResponse> listBidsForMission(Long missionId, Authentication authentication);

    MissionResponse acceptMissionBid(Long missionId, Long bidId, Authentication authentication);

    ProviderWalletResponse getMyWallet(String username);

    ProviderPayoutResponse requestPayout(PayoutCreateRequest request, String username);
}
