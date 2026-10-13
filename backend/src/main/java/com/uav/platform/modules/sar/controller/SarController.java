package com.uav.platform.modules.sar.controller;

import com.uav.platform.modules.sar.common.SarStatus;
import com.uav.platform.modules.sar.config.request.SarMissionRequest;
import com.uav.platform.modules.sar.config.response.SarMissionResponse;
import com.uav.platform.modules.sar.service.SarService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sar")
public class SarController {

    private final SarService sarService;

    public SarController(SarService sarService) {
        this.sarService = sarService;
    }

    @PostMapping("/missions")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_CREATE') or @permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<SarMissionResponse> registerSar(@Valid @RequestBody SarMissionRequest request, Authentication auth) {
        return ResponseEntity.status(201).body(sarService.registerSar(request, auth));
    }

    @GetMapping("/missions/{missionId}")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<SarMissionResponse> getByMissionId(@PathVariable Long missionId, Authentication auth) {
        return ResponseEntity.ok(sarService.getByMissionId(missionId, auth));
    }

    @PatchMapping("/missions/{missionId}/status")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<SarMissionResponse> updateStatus(@PathVariable Long missionId, @RequestParam SarStatus status, Authentication auth) {
        return ResponseEntity.ok(sarService.updateSarStatus(missionId, status, auth));
    }
}
