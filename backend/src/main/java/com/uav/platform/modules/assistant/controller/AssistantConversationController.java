package com.uav.platform.modules.assistant.controller;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.assistant.dto.response.AssistantConversationDetailResponse;
import com.uav.platform.modules.assistant.dto.response.AssistantConversationResponse;
import com.uav.platform.modules.assistant.service.AssistantConversationService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** Administrators review assistant conversations held in every portal. */
@RestController
@RequestMapping("/api/v1/admin/assistant/conversations")
@RequiredArgsConstructor
public class AssistantConversationController {
    private final AssistantConversationService service;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<PageResponse<AssistantConversationResponse>> list(
            @RequestParam(required = false) String portal,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.list(portal, q, page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<AssistantConversationDetailResponse> detail(@PathVariable Long id) {
        return ResponseEntity.ok(service.detail(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) {
        service.delete(id, auth);
        return ResponseEntity.noContent().build();
    }
}
