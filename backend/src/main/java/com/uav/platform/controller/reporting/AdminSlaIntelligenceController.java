package com.uav.platform.controller.reporting;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.response.reporting.SlaIntelligenceResponse;
import com.uav.platform.service.reporting.SlaIntelligenceService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.Admin.SLA_INTELLIGENCE)
@RequiredArgsConstructor
public class AdminSlaIntelligenceController {

    private final SlaIntelligenceService slaIntelligenceService;

    @GetMapping
    @PreAuthorize(
            "@permissionService.has(authentication, 'DASHBOARD_VIEW') and (@permissionService.has(authentication, 'MISSION_VIEW_ALL') or @permissionService.has(authentication, 'USER_MANAGE'))")
    public ResponseEntity<SlaIntelligenceResponse> getIntelligence(Authentication authentication) {
        return ResponseEntity.ok(slaIntelligenceService.getIntelligence(authentication));
    }
}
