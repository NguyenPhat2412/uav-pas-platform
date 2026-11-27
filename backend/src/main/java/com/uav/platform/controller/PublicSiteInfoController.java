package com.uav.platform.controller;

import com.uav.platform.config.ApiRoutes;
import com.uav.platform.dto.response.PublicDiscoveryResponse;
import com.uav.platform.dto.response.PublicSiteInfoResponse;
import com.uav.platform.service.PublicDiscoveryService;
import com.uav.platform.service.SystemConfigService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * Unauthenticated endpoints for public site contact details and live PostgreSQL service/training
 * discovery recommendations shown on the landing page.
 */
@RestController
@RequestMapping(ApiRoutes.Public.BASE)
@RequiredArgsConstructor
public class PublicSiteInfoController {
    private final SystemConfigService configService;
    private final PublicDiscoveryService discoveryService;

    @GetMapping(ApiRoutes.Public.SITE_INFO)
    public ResponseEntity<PublicSiteInfoResponse> siteInfo() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic())
                .body(configService.publicSiteInfo());
    }

    @GetMapping(ApiRoutes.Public.DISCOVERY)
    public ResponseEntity<PublicDiscoveryResponse> discovery() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic())
                .body(discoveryService.getPublicDiscovery());
    }
}
