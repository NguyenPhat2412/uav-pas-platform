package com.uav.platform.modules.webhook.controller;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.modules.webhook.dto.response.WebhookDeliveryLogResponse;
import com.uav.platform.modules.webhook.dto.response.WebhookSecretRotationResponse;
import com.uav.platform.modules.webhook.service.WebhookAdminService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** Operator recovery actions for webhook deliveries and signing secrets. */
@RestController
@RequestMapping(ApiRoutes.Webhooks.BASE)
@RequiredArgsConstructor
public class WebhookAdminController {
    private final WebhookAdminService admin;

    @PostMapping("/deliveries/{id}/retry")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<WebhookDeliveryLogResponse> retryDelivery(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(admin.retryDelivery(id, auth));
    }

    /** The response carries the new secret once; it must never be cached. */
    @PostMapping("/subscriptions/{id}/rotate-secret")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<WebhookSecretRotationResponse> rotateSecret(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(admin.rotateSecret(id, auth));
    }
}
