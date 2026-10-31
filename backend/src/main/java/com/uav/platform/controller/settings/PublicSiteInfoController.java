package com.uav.platform.controller.settings;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.response.settings.PublicSiteInfoResponse;
import com.uav.platform.service.settings.SystemConfigService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/** Unauthenticated: contact details for the marketing site and portals (public settings only). */
@RestController
@RequestMapping(ApiRoutes.Public.BASE)
@RequiredArgsConstructor
public class PublicSiteInfoController {
    private final SystemConfigService configService;

    @GetMapping("/site-info")
    public ResponseEntity<PublicSiteInfoResponse> siteInfo() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofSeconds(60)).cachePublic())
                .body(configService.publicSiteInfo());
    }
}
