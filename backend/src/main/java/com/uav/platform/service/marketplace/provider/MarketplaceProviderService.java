package com.uav.platform.service.marketplace.provider;

import com.uav.platform.dto.request.marketplace.catalog.MissionBidCreateRequest;
import com.uav.platform.dto.request.marketplace.escrow.PayoutCreateRequest;
import com.uav.platform.dto.request.marketplace.provider.MarketplaceListingUpsertRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderDocumentCreateRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderEquipmentCreateRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOnboardingRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOrderActionRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderOrderCompleteRequest;
import com.uav.platform.dto.request.marketplace.provider.ProviderUavCreateRequest;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingResponse;
import com.uav.platform.dto.response.marketplace.catalog.MissionBidResponse;
import com.uav.platform.dto.response.marketplace.escrow.ProviderPayoutResponse;
import com.uav.platform.dto.response.marketplace.escrow.ProviderWalletResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderDocumentResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderEquipmentResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderFleetSummaryResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderProfileResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderUavResponse;
import com.uav.platform.dto.response.mission.lifecycle.MissionResponse;

import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

public interface MarketplaceProviderService {

    Optional<ProviderProfileResponse> findMyProfile(String username);

    ProviderProfileResponse upsertMyProfile(ProviderOnboardingRequest request, String username);

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
