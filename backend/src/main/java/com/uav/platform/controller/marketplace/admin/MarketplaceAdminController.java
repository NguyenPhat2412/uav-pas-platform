package com.uav.platform.controller.marketplace.admin;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.marketplace.admin.ListingModerationRequest;
import com.uav.platform.dto.request.marketplace.admin.ProviderModerationRequest;
import com.uav.platform.dto.request.marketplace.escrow.PayoutProcessRequest;
import com.uav.platform.dto.response.marketplace.catalog.MarketplaceListingResponse;
import com.uav.platform.dto.response.marketplace.escrow.ProviderPayoutResponse;
import com.uav.platform.dto.response.marketplace.provider.ProviderProfileResponse;
import com.uav.platform.enums.marketplace.ListingModerationStatus;
import com.uav.platform.enums.marketplace.PayoutStatus;
import com.uav.platform.enums.marketplace.ProviderVerificationStatus;
import com.uav.platform.service.marketplace.admin.MarketplaceAdminService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.Marketplace.ADMIN_BASE)
@RequiredArgsConstructor
public class MarketplaceAdminController {

    private final MarketplaceAdminService adminService;

    @GetMapping(ApiRoutes.Marketplace.ADMIN_PROVIDERS)
    @PreAuthorize("@permissionService.has(authentication, 'MARKETPLACE_MODERATE')")
    public ResponseEntity<PageResponse<ProviderProfileResponse>> listProviders(
            @RequestParam(required = false) ProviderVerificationStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                adminService.listProviders(status, keyword, PageRequest.of(page, size)));
    }

    @PatchMapping(ApiRoutes.Marketplace.ADMIN_PROVIDER_MODERATE)
    @PreAuthorize("@permissionService.has(authentication, 'MARKETPLACE_MODERATE')")
    public ResponseEntity<ProviderProfileResponse> moderateProvider(
            @PathVariable Long id,
            @Valid @RequestBody ProviderModerationRequest request,
            Authentication auth) {
        return ResponseEntity.ok(adminService.moderateProvider(id, request, auth.getName()));
    }

    @GetMapping(ApiRoutes.Marketplace.ADMIN_LISTINGS)
    @PreAuthorize("@permissionService.has(authentication, 'MARKETPLACE_MODERATE')")
    public ResponseEntity<PageResponse<MarketplaceListingResponse>> listListings(
            @RequestParam(required = false) ListingModerationStatus status,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                adminService.listListings(status, keyword, PageRequest.of(page, size)));
    }

    @PatchMapping(ApiRoutes.Marketplace.ADMIN_LISTING_MODERATE)
    @PreAuthorize("@permissionService.has(authentication, 'MARKETPLACE_MODERATE')")
    public ResponseEntity<MarketplaceListingResponse> moderateListing(
            @PathVariable Long id,
            @Valid @RequestBody ListingModerationRequest request,
            Authentication auth) {
        return ResponseEntity.ok(adminService.moderateListing(id, request, auth.getName()));
    }

    @GetMapping(ApiRoutes.Marketplace.ADMIN_PAYOUTS)
    @PreAuthorize("@permissionService.has(authentication, 'PAYOUT_MANAGE')")
    public ResponseEntity<PageResponse<ProviderPayoutResponse>> listPayouts(
            @RequestParam(required = false) PayoutStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.listPayouts(status, PageRequest.of(page, size)));
    }

    @PostMapping(ApiRoutes.Marketplace.ADMIN_PAYOUT_PROCESS)
    @PreAuthorize("@permissionService.has(authentication, 'PAYOUT_MANAGE')")
    public ResponseEntity<ProviderPayoutResponse> processPayout(
            @PathVariable Long id,
            @Valid @RequestBody PayoutProcessRequest request,
            Authentication auth) {
        return ResponseEntity.ok(adminService.processPayout(id, request, auth.getName()));
    }
}
