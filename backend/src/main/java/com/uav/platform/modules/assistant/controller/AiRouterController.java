package com.uav.platform.modules.assistant.controller;

import com.uav.platform.modules.assistant.dto.request.AiRouterSettingsRequest;
import com.uav.platform.modules.assistant.dto.request.AssistantChatRequest;
import com.uav.platform.modules.assistant.dto.response.AiRouterSettingsResponse;
import com.uav.platform.modules.assistant.dto.response.AiRouterStatusResponse;
import com.uav.platform.modules.assistant.dto.response.AssistantChatResponse;
import com.uav.platform.modules.assistant.dto.response.AssistantInfoResponse;
import com.uav.platform.modules.assistant.service.AiRouterService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** 9router gateway management (admins) and the admin assistant chat that runs through it. */
@RestController
@RequestMapping("/api/v1")
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
