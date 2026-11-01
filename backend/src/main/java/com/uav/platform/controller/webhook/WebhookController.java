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

    @GetMapping(ApiRoutes.Webhooks.STATUS)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<WebhookStatusResponse> status() {
        return ResponseEntity.ok(new WebhookStatusResponse(webhookService.dispatchStatus()));
    }

    @GetMapping(ApiRoutes.Webhooks.SUBSCRIPTIONS)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<List<WebhookSubscriptionResponse>> listSubscriptions() {
        return ResponseEntity.ok(webhookService.listSubscriptions());
    }

    @PostMapping(ApiRoutes.Webhooks.SUBSCRIPTIONS)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<WebhookSubscriptionResponse> createSubscription(
            @Valid @RequestBody WebhookSubscriptionRequest request) {
        return ResponseEntity.ok(webhookService.createSubscription(request));
    }

    @PutMapping(ApiRoutes.Webhooks.TOGGLE_SUBSCRIPTION)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<Void> toggleSubscription(
            @PathVariable Long id, @RequestParam boolean active) {
        webhookService.toggleSubscription(id, active);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping(ApiRoutes.Webhooks.SUBSCRIPTION_BY_ID)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<Void> deleteSubscription(@PathVariable Long id) {
        webhookService.deleteSubscription(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(ApiRoutes.Webhooks.TEST_DISPATCH)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<WebhookDispatchResponse> testDispatch(
            @RequestBody WebhookTestDispatchRequest request) {
        return ResponseEntity.ok(webhookService.dispatchTest(request));
    }

    @GetMapping(ApiRoutes.Webhooks.LOGS)
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<Page<WebhookDeliveryLogResponse>> listLogs(Pageable pageable) {
        return ResponseEntity.ok(webhookService.listDeliveryLogs(Pageables.from(pageable, 20)));
    }
}
