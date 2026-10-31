package com.uav.platform.controller.assistant;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.assistant.AiRouterSettingsRequest;
import com.uav.platform.dto.request.assistant.AssistantChatRequest;
import com.uav.platform.dto.response.assistant.AiRouterSettingsResponse;
import com.uav.platform.dto.response.assistant.AiRouterStatusResponse;
import com.uav.platform.dto.response.assistant.AssistantChatResponse;
import com.uav.platform.dto.response.assistant.AssistantInfoResponse;
import com.uav.platform.service.assistant.AiRouterService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** 9router gateway management (admins) and the admin assistant chat that runs through it. */
@RestController
@RequestMapping(ApiRoutes.API_V1_PREFIX)
@RequiredArgsConstructor
public class AiRouterController {
    private final AiRouterService service;

    @GetMapping("/admin/ai-router")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<AiRouterSettingsResponse> settings() {
        return ResponseEntity.ok(service.settings());
    }

    @PutMapping("/admin/ai-router")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<AiRouterSettingsResponse> update(
            @Valid @RequestBody AiRouterSettingsRequest request, Authentication auth) {
        return ResponseEntity.ok(service.update(request, auth));
    }

    @GetMapping("/admin/ai-router/status")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<AiRouterStatusResponse> status() {
        return ResponseEntity.ok(service.status());
    }

    @GetMapping("/assistant")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AssistantInfoResponse> info() {
        return ResponseEntity.ok(service.info());
    }

    @PostMapping("/assistant/chat")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AssistantChatResponse> chat(
            @Valid @RequestBody AssistantChatRequest request, Authentication auth) {
        return ResponseEntity.ok(service.chat(request, auth));
    }
}
