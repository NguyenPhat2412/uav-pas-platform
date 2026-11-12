package com.uav.platform.controller.mission;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.mission.SavedFlightSiteUpsertRequest;
import com.uav.platform.dto.response.mission.SavedFlightSiteResponse;
import com.uav.platform.service.mission.SavedFlightSiteService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiRoutes.FlightSites.BASE)
@RequiredArgsConstructor
public class FlightSiteController {

    private final SavedFlightSiteService savedFlightSiteService;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<List<SavedFlightSiteResponse>> listMySites(
            Authentication authentication) {
        return ResponseEntity.ok(savedFlightSiteService.listMySites(authentication));
    }

    @PostMapping
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CREATE')")
    public ResponseEntity<SavedFlightSiteResponse> createSite(
            @Valid @RequestBody SavedFlightSiteUpsertRequest request,
            Authentication authentication) {
        return ResponseEntity.status(201)
                .body(savedFlightSiteService.createSite(request, authentication));
    }

    @DeleteMapping(ApiRoutes.FlightSites.BY_ID)
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CREATE')")
    public ResponseEntity<Void> deleteSite(@PathVariable Long id, Authentication authentication) {
        savedFlightSiteService.deleteSite(id, authentication);
        return ResponseEntity.noContent().build();
    }
}
