package com.uav.platform.controller;

import com.uav.platform.config.ApiRoutes;
import com.uav.platform.dto.request.SwitchLocaleRequest;
import com.uav.platform.dto.response.PublicLocaleBundleResponse;
import com.uav.platform.service.UiTranslationService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Unauthenticated endpoints serving PostgreSQL-backed translations (vi, en, ja) and handling
 * runtime language switching via API across Web portals and Mobile.
 */
@RestController
@RequestMapping(ApiRoutes.Public.BASE)
@RequiredArgsConstructor
public class PublicI18nController {

    private final UiTranslationService translationService;

    @GetMapping(ApiRoutes.Public.I18N_BY_LOCALE)
    public ResponseEntity<PublicLocaleBundleResponse> getBundle(
            @PathVariable String locale, @RequestParam(required = false) String namespace) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(translationService.getPublicBundle(locale, namespace));
    }

    @PostMapping(ApiRoutes.Public.I18N_SWITCH)
    public ResponseEntity<PublicLocaleBundleResponse> switchLocale(
            @Valid @RequestBody SwitchLocaleRequest request) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(translationService.getPublicBundle(request.locale(), request.namespace()));
    }
}
