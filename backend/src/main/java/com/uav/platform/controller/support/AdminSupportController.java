package com.uav.platform.controller.support;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.support.SupportAdminReplyRequest;
import com.uav.platform.dto.request.support.SupportQuickReplyUpsertRequest;
import com.uav.platform.dto.request.support.SupportStatusUpdateRequest;
import com.uav.platform.dto.response.support.SupportAdminSummaryResponse;
import com.uav.platform.dto.response.support.SupportQuickReplyResponse;
import com.uav.platform.dto.response.support.SupportThreadDetailResponse;
import com.uav.platform.dto.response.support.SupportThreadResponse;
import com.uav.platform.service.support.SupportService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Admin support inbox, 2-way visitor chat reply, and quick-reply template management. */
@RestController
@RequestMapping(ApiRoutes.Admin.SUPPORT)
@RequiredArgsConstructor
public class AdminSupportController {

    private final SupportService supportService;

    @GetMapping(ApiRoutes.Admin.SUPPORT_SUMMARY)
    @PreAuthorize("@permissionService.has(authentication, 'SUPPORT_MANAGE')")
    public ResponseEntity<SupportAdminSummaryResponse> summary() {
        return ResponseEntity.ok(supportService.getAdminSummary());
    }

    @GetMapping(ApiRoutes.Admin.SUPPORT_THREADS)
    @PreAuthorize("@permissionService.has(authentication, 'SUPPORT_MANAGE')")
    public ResponseEntity<PageResponse<SupportThreadResponse>> listThreads(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) Boolean unreadOnly,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                supportService.listAdminThreads(status, topic, unreadOnly, q, page, size));
    }

    @GetMapping(ApiRoutes.Admin.SUPPORT_THREAD_BY_ID)
    @PreAuthorize("@permissionService.has(authentication, 'SUPPORT_MANAGE')")
    public ResponseEntity<SupportThreadDetailResponse> getThreadDetail(@PathVariable Long id) {
        return ResponseEntity.ok(supportService.getAdminThreadDetail(id));
    }

    @PostMapping(ApiRoutes.Admin.SUPPORT_THREAD_REPLY)
    @PreAuthorize("@permissionService.has(authentication, 'SUPPORT_MANAGE')")
    public ResponseEntity<SupportThreadDetailResponse> reply(
            @PathVariable Long id,
            @Valid @RequestBody SupportAdminReplyRequest request,
            Authentication auth) {
        return ResponseEntity.ok(supportService.replyAsAdmin(id, request, auth));
    }

    @PatchMapping(ApiRoutes.Admin.SUPPORT_THREAD_STATUS)
    @PreAuthorize("@permissionService.has(authentication, 'SUPPORT_MANAGE')")
    public ResponseEntity<SupportThreadResponse> updateStatus(
            @PathVariable Long id, @Valid @RequestBody SupportStatusUpdateRequest request) {
        return ResponseEntity.ok(supportService.updateThreadStatus(id, request));
    }

    @DeleteMapping(ApiRoutes.Admin.SUPPORT_THREAD_BY_ID)
    @PreAuthorize("@permissionService.has(authentication, 'SUPPORT_MANAGE')")
    public ResponseEntity<Void> deleteThread(@PathVariable Long id) {
        supportService.deleteThread(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(ApiRoutes.Admin.SUPPORT_QUICK_REPLIES)
    @PreAuthorize("@permissionService.has(authentication, 'SUPPORT_MANAGE')")
    public ResponseEntity<List<SupportQuickReplyResponse>> listQuickReplies() {
        return ResponseEntity.ok(supportService.listQuickReplies());
    }

    @PostMapping(ApiRoutes.Admin.SUPPORT_QUICK_REPLIES)
    @PreAuthorize("@permissionService.has(authentication, 'SUPPORT_MANAGE')")
    public ResponseEntity<SupportQuickReplyResponse> createQuickReply(
            @Valid @RequestBody SupportQuickReplyUpsertRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(supportService.createQuickReply(request, auth));
    }

    @PutMapping(ApiRoutes.Admin.SUPPORT_QUICK_REPLY_BY_ID)
    @PreAuthorize("@permissionService.has(authentication, 'SUPPORT_MANAGE')")
    public ResponseEntity<SupportQuickReplyResponse> updateQuickReply(
            @PathVariable Long id, @Valid @RequestBody SupportQuickReplyUpsertRequest request) {
        return ResponseEntity.ok(supportService.updateQuickReply(id, request));
    }

    @DeleteMapping(ApiRoutes.Admin.SUPPORT_QUICK_REPLY_BY_ID)
    @PreAuthorize("@permissionService.has(authentication, 'SUPPORT_MANAGE')")
    public ResponseEntity<Void> deleteQuickReply(@PathVariable Long id) {
        supportService.deleteQuickReply(id);
        return ResponseEntity.noContent().build();
    }
}
