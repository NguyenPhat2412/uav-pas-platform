package com.uav.platform.controller;

import com.uav.platform.config.ApiRoutes;
import com.uav.platform.dto.response.MissionBidResponse;
import com.uav.platform.dto.response.MissionResponse;
import com.uav.platform.service.MarketplaceProviderService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiRoutes.Marketplace.RFQ_BASE)
@RequiredArgsConstructor
public class MarketplaceRfqController {

    private final MarketplaceProviderService providerService;

    @GetMapping(ApiRoutes.Marketplace.MISSION_BIDS)
    public ResponseEntity<List<MissionBidResponse>> listMissionBids(
            @PathVariable Long missionId, Authentication auth) {
        return ResponseEntity.ok(providerService.listBidsForMission(missionId, auth));
    }

    @PostMapping(ApiRoutes.Marketplace.ACCEPT_MISSION_BID)
    public ResponseEntity<MissionResponse> acceptMissionBid(
            @PathVariable Long missionId, @PathVariable Long bidId, Authentication auth) {
        return ResponseEntity.ok(providerService.acceptMissionBid(missionId, bidId, auth));
    }
}
