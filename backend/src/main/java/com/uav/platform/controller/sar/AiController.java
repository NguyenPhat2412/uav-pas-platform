package com.uav.platform.controller.sar;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.sar.AiTaskDispatchRequest;
import com.uav.platform.dto.request.sar.AiTaskResultRequest;
import com.uav.platform.dto.request.sar.VerifyDetectionRequest;
import com.uav.platform.dto.response.sar.AiDetectionResponse;
import com.uav.platform.dto.response.sar.AiTaskResponse;
import com.uav.platform.service.sar.AiService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiRoutes.Ai.BASE)
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    @PostMapping("/dispatch")
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_CREATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<AiTaskResponse> dispatchTask(
            @Valid @RequestBody AiTaskDispatchRequest request, Authentication auth) {
        return ResponseEntity.status(201).body(aiService.dispatchTask(request, auth));
    }

    @GetMapping("/missions/{missionId}/detections")
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_VIEW') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<List<AiDetectionResponse>> listDetections(
            @PathVariable Long missionId, Authentication auth) {
        return ResponseEntity.ok(aiService.listDetections(missionId, auth));
    }

    @GetMapping("/missions/{missionId}/tasks")
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_VIEW') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<List<AiTaskResponse>> listTasks(
            @PathVariable Long missionId, Authentication auth) {
        return ResponseEntity.ok(aiService.listTasks(missionId, auth));
    }

    /** Called by the KV260 edge board / cloud inference worker (gateway service account). */
    @PostMapping("/tasks/{id}/results")
    @PreAuthorize("@permissionService.has(authentication, 'UAV_MANAGE')")
    public ResponseEntity<AiTaskResponse> submitResults(
            @PathVariable Long id,
            @Valid @RequestBody AiTaskResultRequest request,
            Authentication auth) {
        return ResponseEntity.ok(aiService.submitResults(id, request, auth));
    }

    @PatchMapping("/detections/{id}/verify")
    @PreAuthorize(
            "@permissionService.has(authentication, 'MISSION_STATUS_UPDATE') or @permissionService.has(authentication, 'MISSION_VIEW_ALL')")
    public ResponseEntity<AiDetectionResponse> verifyDetection(
            @PathVariable Long id,
            @Valid @RequestBody VerifyDetectionRequest request,
            Authentication auth) {
        return ResponseEntity.ok(aiService.verifyDetection(id, request, auth));
    }
}
