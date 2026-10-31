package com.uav.platform.controller.webhook;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.response.webhook.WebhookDeliveryLogResponse;
import com.uav.platform.dto.response.webhook.WebhookSecretRotationResponse;
import com.uav.platform.service.webhook.WebhookAdminService;

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
