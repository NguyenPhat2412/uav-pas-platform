package com.uav.platform.modules.webhook.controller;

import com.uav.platform.modules.webhook.dto.request.WebhookSubscriptionRequest;
import com.uav.platform.modules.webhook.dto.response.WebhookDeliveryLogResponse;
import com.uav.platform.modules.webhook.dto.response.WebhookSubscriptionResponse;
import com.uav.platform.modules.webhook.service.WebhookService;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/webhooks")
public class WebhookController {

    private final WebhookService webhookService;

    public WebhookController(WebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @GetMapping("/status")
    @PreAuthorize(
            "@permissionService.has(authentication, 'USER_MANAGE') or hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> status() {
        return ResponseEntity.ok(Map.of("status", webhookService.dispatchStatus()));
    }

    @GetMapping("/subscriptions")
    @PreAuthorize(
            "@permissionService.has(authentication, 'USER_MANAGE') or hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<List<WebhookSubscriptionResponse>> listSubscriptions() {
        return ResponseEntity.ok(webhookService.listSubscriptions());
    }

    @PostMapping("/subscriptions")
    @PreAuthorize(
            "@permissionService.has(authentication, 'USER_MANAGE') or hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<WebhookSubscriptionResponse> createSubscription(
            @Valid @RequestBody WebhookSubscriptionRequest request) {
        return ResponseEntity.ok(webhookService.createSubscription(request));
    }

    @PutMapping("/subscriptions/{id}/toggle")
    @PreAuthorize(
            "@permissionService.has(authentication, 'USER_MANAGE') or hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> toggleSubscription(
            @PathVariable Long id, @RequestParam boolean active) {
        webhookService.toggleSubscription(id, active);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/subscriptions/{id}")
    @PreAuthorize(
            "@permissionService.has(authentication, 'USER_MANAGE') or hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> deleteSubscription(@PathVariable Long id) {
        webhookService.deleteSubscription(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/test-dispatch")
    @PreAuthorize(
            "@permissionService.has(authentication, 'USER_MANAGE') or hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> testDispatch(@RequestBody Map<String, Object> body) {
        String eventType = (String) body.getOrDefault("eventType", "SAR_EMERGENCY_TRIGGERED");
        String outcome = webhookService.dispatchEvent(eventType, body);
        return ResponseEntity.ok(
                Map.of(
                        "status",
                        outcome,
                        "message",
                        "Đã ghi nhận yêu cầu. Kiểm tra nhật ký để biết kết quả HTTP; chưa xác nhận bên nhận đã xử lý."));
    }

    @GetMapping("/logs")
    @PreAuthorize(
            "@permissionService.has(authentication, 'USER_MANAGE') or hasAnyAuthority('ROLE_ADMIN', 'ADMIN')")
    public ResponseEntity<Page<WebhookDeliveryLogResponse>> listLogs(Pageable pageable) {
        int page =
                pageable != null && pageable.isPaged() ? Math.max(pageable.getPageNumber(), 0) : 0;
        int size =
                pageable != null && pageable.isPaged()
                        ? Math.min(Math.max(pageable.getPageSize(), 1), 100)
                        : 20;
        return ResponseEntity.ok(
                webhookService.listDeliveryLogs(
                        org.springframework.data.domain.PageRequest.of(page, size)));
    }
}
