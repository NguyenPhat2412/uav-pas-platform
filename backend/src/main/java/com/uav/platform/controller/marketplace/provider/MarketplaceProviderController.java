package com.uav.platform.controller.marketplace.provider;

import com.uav.platform.config.routes.ApiRoutes;
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
import com.uav.platform.service.marketplace.provider.MarketplaceProviderService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiRoutes.Marketplace.PROVIDER_BASE)
@RequiredArgsConstructor
public class MarketplaceProviderController {

    private final MarketplaceProviderService providerService;

    @GetMapping(ApiRoutes.Marketplace.ME)
    public ResponseEntity<ProviderProfileResponse> getMyProfile(Authentication auth) {
        return providerService
                .findMyProfile(auth.getName())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping(ApiRoutes.Marketplace.ME)
    public ResponseEntity<ProviderProfileResponse> upsertMyProfile(
            @Valid @RequestBody ProviderOnboardingRequest request, Authentication auth) {
        return ResponseEntity.ok(providerService.upsertMyProfile(request, auth.getName()));
    }

    @PostMapping(ApiRoutes.Marketplace.DOCUMENTS)
    public ResponseEntity<ProviderDocumentResponse> addDocument(
            @Valid @RequestBody ProviderDocumentCreateRequest request, Authentication auth) {
        return ResponseEntity.status(201)
                .body(providerService.addDocument(request, auth.getName()));
    }

    @DeleteMapping(ApiRoutes.Marketplace.DOCUMENT_BY_ID)
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id, Authentication auth) {
        providerService.deleteDocument(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    @GetMapping(ApiRoutes.Marketplace.LISTINGS)
    public ResponseEntity<List<MarketplaceListingResponse>> listMyListings(Authentication auth) {
        return ResponseEntity.ok(providerService.listMyListings(auth.getName()));
    }

    @PostMapping(ApiRoutes.Marketplace.LISTINGS)
    public ResponseEntity<MarketplaceListingResponse> createListing(
            @Valid @RequestBody MarketplaceListingUpsertRequest request, Authentication auth) {
        return ResponseEntity.status(201)
                .body(providerService.createListing(request, auth.getName()));
    }

    @PutMapping(ApiRoutes.Marketplace.LISTING_BY_ID)
    public ResponseEntity<MarketplaceListingResponse> updateListing(
            @PathVariable Long id,
            @Valid @RequestBody MarketplaceListingUpsertRequest request,
            Authentication auth) {
        return ResponseEntity.ok(providerService.updateListing(id, request, auth.getName()));
    }

    @PatchMapping(ApiRoutes.Marketplace.LISTING_PAUSE)
    public ResponseEntity<MarketplaceListingResponse> toggleListingPause(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(providerService.toggleListingPause(id, auth.getName()));
    }

    @GetMapping(ApiRoutes.Marketplace.FLEET)
    public ResponseEntity<ProviderFleetSummaryResponse> getMyFleet(Authentication auth) {
        return ResponseEntity.ok(providerService.getMyFleet(auth.getName()));
    }

    @PostMapping(ApiRoutes.Marketplace.FLEET_UAVS)
    public ResponseEntity<ProviderUavResponse> registerUav(
            @Valid @RequestBody ProviderUavCreateRequest request, Authentication auth) {
        return ResponseEntity.status(201)
                .body(providerService.registerProviderUav(request, auth.getName()));
    }

    @PostMapping(ApiRoutes.Marketplace.FLEET_EQUIPMENT)
    public ResponseEntity<ProviderEquipmentResponse> registerEquipment(
            @Valid @RequestBody ProviderEquipmentCreateRequest request, Authentication auth) {
        return ResponseEntity.status(201)
                .body(providerService.registerProviderEquipment(request, auth.getName()));
    }

    @GetMapping(ApiRoutes.Marketplace.ORDERS)
    public ResponseEntity<List<MissionResponse>> listMyOrders(Authentication auth) {
        return ResponseEntity.ok(providerService.listMyOrders(auth.getName()));
    }

    @PostMapping(ApiRoutes.Marketplace.ORDER_RESPOND)
    public ResponseEntity<MissionResponse> respondToOrder(
            @PathVariable Long missionId,
            @Valid @RequestBody ProviderOrderActionRequest request,
            Authentication auth) {
        return ResponseEntity.ok(
                providerService.respondToOrder(missionId, request, auth.getName()));
    }

    @PostMapping(ApiRoutes.Marketplace.ORDER_START)
    public ResponseEntity<MissionResponse> startOrder(
            @PathVariable Long missionId, Authentication auth) {
        return ResponseEntity.ok(providerService.startOrder(missionId, auth.getName()));
    }

    @PostMapping(ApiRoutes.Marketplace.ORDER_COMPLETE)
    public ResponseEntity<MissionResponse> completeOrder(
            @PathVariable Long missionId,
            @Valid @RequestBody ProviderOrderCompleteRequest request,
            Authentication auth) {
        return ResponseEntity.ok(providerService.completeOrder(missionId, request, auth.getName()));
    }

    @GetMapping(ApiRoutes.Marketplace.OPEN_RFQ)
    public ResponseEntity<List<MissionResponse>> listOpenRfqs(Authentication auth) {
        return ResponseEntity.ok(providerService.listOpenRfqs(auth.getName()));
    }

    @PostMapping(ApiRoutes.Marketplace.SUBMIT_BID)
    public ResponseEntity<MissionBidResponse> submitBid(
            @PathVariable Long missionId,
            @Valid @RequestBody MissionBidCreateRequest request,
            Authentication auth) {
        return ResponseEntity.status(201)
                .body(providerService.submitRfqBid(missionId, request, auth.getName()));
    }

    @GetMapping(ApiRoutes.Marketplace.MY_BIDS)
    public ResponseEntity<List<MissionBidResponse>> listMyBids(Authentication auth) {
        return ResponseEntity.ok(providerService.listMyBids(auth.getName()));
    }

    @GetMapping(ApiRoutes.Marketplace.WALLET)
    public ResponseEntity<ProviderWalletResponse> getMyWallet(Authentication auth) {
        return ResponseEntity.ok(providerService.getMyWallet(auth.getName()));
    }

    @PostMapping(ApiRoutes.Marketplace.PAYOUTS)
    public ResponseEntity<ProviderPayoutResponse> requestPayout(
            @Valid @RequestBody PayoutCreateRequest request, Authentication auth) {
        return ResponseEntity.status(201)
                .body(providerService.requestPayout(request, auth.getName()));
    }
}
