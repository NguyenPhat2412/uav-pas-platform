package com.uav.platform.modules.notification.controller;

import com.uav.platform.common.dto.response.MessageResponse;
import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.common.util.Pageables;
import com.uav.platform.modules.notification.dto.request.CreateNotificationRequest;
import com.uav.platform.modules.notification.dto.response.NotificationResponse;
import com.uav.platform.modules.notification.dto.response.UnreadCountResponse;
import com.uav.platform.modules.notification.service.NotificationService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<PageResponse<NotificationResponse>> listForUser(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(
                notificationService.listForUser(auth, Pageables.desc(page, size, "createdAt")));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> countUnread(Authentication auth) {
        return ResponseEntity.ok(new UnreadCountResponse(notificationService.countUnread(auth)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(notificationService.markAsRead(id, auth));
    }

    @PostMapping("/read-all")
    public ResponseEntity<MessageResponse> markAllAsRead(Authentication auth) {
        notificationService.markAllAsRead(auth);
        return ResponseEntity.ok(new MessageResponse("All notifications marked as read"));
    }

    @PostMapping
    @PreAuthorize("@permissionService.has(authentication, 'USER_MANAGE')")
    public ResponseEntity<NotificationResponse> sendNotification(
            @Valid @RequestBody CreateNotificationRequest request) {
        return ResponseEntity.status(201).body(notificationService.sendNotification(request));
    }
}
