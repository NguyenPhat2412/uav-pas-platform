package com.uav.platform.controller.webhook;

import com.uav.platform.common.util.Pageables;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.webhook.WebhookSubscriptionRequest;
import com.uav.platform.dto.request.webhook.WebhookTestDispatchRequest;
import com.uav.platform.dto.response.webhook.WebhookDeliveryLogResponse;
import com.uav.platform.dto.response.webhook.WebhookDispatchResponse;
import com.uav.platform.dto.response.webhook.WebhookStatusResponse;
import com.uav.platform.dto.response.webhook.WebhookSubscriptionResponse;
import com.uav.platform.service.webhook.WebhookService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiRoutes.Webhooks.BASE)
@RequiredArgsConstructor
public class WebhookController {

    private final WebhookService webhookService;

    @GetMapping("/status")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<WebhookStatusResponse> status() {
        return ResponseEntity.ok(new WebhookStatusResponse(webhookService.dispatchStatus()));
    }

    @GetMapping("/subscriptions")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<List<WebhookSubscriptionResponse>> listSubscriptions() {
        return ResponseEntity.ok(webhookService.listSubscriptions());
    }

    @PostMapping("/subscriptions")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<WebhookSubscriptionResponse> createSubscription(
            @Valid @RequestBody WebhookSubscriptionRequest request) {
        return ResponseEntity.ok(webhookService.createSubscription(request));
    }

    @PutMapping("/subscriptions/{id}/toggle")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<Void> toggleSubscription(
            @PathVariable Long id, @RequestParam boolean active) {
        webhookService.toggleSubscription(id, active);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/subscriptions/{id}")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<Void> deleteSubscription(@PathVariable Long id) {
        webhookService.deleteSubscription(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/test-dispatch")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<WebhookDispatchResponse> testDispatch(
            @RequestBody WebhookTestDispatchRequest request) {
        return ResponseEntity.ok(webhookService.dispatchTest(request));
    }

    @GetMapping("/logs")
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<Page<WebhookDeliveryLogResponse>> listLogs(Pageable pageable) {
        return ResponseEntity.ok(webhookService.listDeliveryLogs(Pageables.from(pageable, 20)));
    }
}
