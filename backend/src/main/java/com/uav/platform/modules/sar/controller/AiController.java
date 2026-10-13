package com.uav.platform.modules.sar.controller;

import com.uav.platform.modules.sar.config.request.AiTaskDispatchRequest;
import com.uav.platform.modules.sar.config.request.VerifyDetectionRequest;
import com.uav.platform.modules.sar.config.response.AiDetectionResponse;
import com.uav.platform.modules.sar.config.response.AiTaskResponse;
import com.uav.platform.modules.sar.service.AiService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @PostMapping("/dispatch")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<AiTaskResponse> dispatchTask(@Valid @RequestBody AiTaskDispatchRequest request, Authentication auth) {
        return ResponseEntity.status(201).body(aiService.dispatchTask(request, auth));
    }

    @GetMapping("/missions/{missionId}/detections")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<List<AiDetectionResponse>> listDetections(@PathVariable Long missionId, Authentication auth) {
        return ResponseEntity.ok(aiService.listDetections(missionId, auth));
    }

    @GetMapping("/missions/{missionId}/tasks")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<List<AiTaskResponse>> listTasks(@PathVariable Long missionId, Authentication auth) {
        return ResponseEntity.ok(aiService.listTasks(missionId, auth));
    }

    @PatchMapping("/detections/{id}/verify")
    @PreAuthorize("@permissionService.has(authentication, 'MISSION_VIEW')")
    public ResponseEntity<AiDetectionResponse> verifyDetection(@PathVariable Long id, @Valid @RequestBody VerifyDetectionRequest request, Authentication auth) {
        return ResponseEntity.ok(aiService.verifyDetection(id, request, auth));
    }
}
