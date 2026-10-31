package com.uav.platform.controller.storage;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.storage.AdminFileQueryRequest;
import com.uav.platform.dto.response.storage.AdminFileDownloadResponse;
import com.uav.platform.dto.response.storage.AdminFileResponse;
import com.uav.platform.dto.response.storage.AdminFileSummaryResponse;
import com.uav.platform.enums.storage.StoredFileKind;
import com.uav.platform.enums.storage.StoredFileModule;
import com.uav.platform.enums.storage.StoredFileStatus;
import com.uav.platform.service.storage.AdminFileService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin file manager: every object the platform stores, with its owner and what uses it. Gated like the
 * infrastructure pages. Only files nothing references can be deleted; mission media is read-only here.
 */
@RestController
@RequestMapping(ApiRoutes.Admin.FILES)
@RequiredArgsConstructor
public class AdminFileController {
    private final AdminFileService files;

    @GetMapping
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<PageResponse<AdminFileResponse>> list(
            @RequestParam(required = false) StoredFileModule module,
            @RequestParam(required = false) StoredFileKind type,
            @RequestParam(required = false) StoredFileStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        return ResponseEntity.ok(
                files.list(new AdminFileQueryRequest(module, type, status, q), page, size, sort));
    }

    @GetMapping("/summary")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<AdminFileSummaryResponse> summary() {
        return ResponseEntity.ok(files.summary());
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<AdminFileDownloadResponse> download(
            @PathVariable String id, Authentication authentication) {
        return ResponseEntity.ok(files.downloadUrl(id, authentication.getName()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionService.has(authentication, 'PERMISSION_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication authentication) {
        files.delete(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
