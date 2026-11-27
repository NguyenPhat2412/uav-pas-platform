package com.uav.platform.controller;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.config.ApiRoutes;
import com.uav.platform.dto.request.UpsertUiTranslationRequest;
import com.uav.platform.dto.response.UiTranslationNamespacesResponse;
import com.uav.platform.dto.response.UiTranslationRowResponse;
import com.uav.platform.service.UiTranslationService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Admin CRUD API for PostgreSQL-backed UI translations across Vietnamese, English, and Japanese.
 */
@RestController
@RequestMapping(ApiRoutes.Admin.I18N)
@RequiredArgsConstructor
public class AdminI18nController {

    private final UiTranslationService translationService;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<PageResponse<UiTranslationRowResponse>> list(
            @RequestParam(required = false) String namespace,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(translationService.searchGrouped(namespace, keyword, page, size));
    }

    @GetMapping(ApiRoutes.Admin.I18N_NAMESPACES)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<UiTranslationNamespacesResponse> listNamespaces() {
        return ResponseEntity.ok(
                new UiTranslationNamespacesResponse(translationService.listNamespaces()));
    }

    @PutMapping
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<UiTranslationRowResponse> upsert(
            @Valid @RequestBody UpsertUiTranslationRequest request, Authentication authentication) {
        return ResponseEntity.ok(translationService.upsertGroup(request, authentication));
    }

    @DeleteMapping(ApiRoutes.Admin.I18N_BY_ID)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<Void> deleteById(@PathVariable Long id, Authentication authentication) {
        translationService.deleteByIdOrKey(id, null, authentication);
        return ResponseEntity.noContent().build();
    }
}
