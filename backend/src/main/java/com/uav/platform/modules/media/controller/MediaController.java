package com.uav.platform.modules.media.controller;


import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.modules.media.config.request.*;
import com.uav.platform.modules.media.config.response.*;
import com.uav.platform.modules.media.service.MediaService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/media")
public class MediaController {
    private final MediaService service;
    public MediaController(MediaService service) { this.service = service; }
    @GetMapping @PreAuthorize("@permissionService.has(authentication, 'MEDIA_READ')")
    public ResponseEntity<PageResponse<MediaAssetResponse>> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) { return ResponseEntity.ok(service.list(PageRequest.of(page, size, Sort.by("createdAt").descending()))); }
    @PostMapping @PreAuthorize("@permissionService.has(authentication, 'MEDIA_MANAGE')")
    public ResponseEntity<MediaAssetResponse> register(@Valid @RequestBody MediaUploadRequest request, Authentication auth) { return ResponseEntity.status(201).body(service.register(request, auth.getName())); }
    @GetMapping("/{id}/upload-url") @PreAuthorize("@permissionService.has(authentication, 'MEDIA_MANAGE')")
    public ResponseEntity<SignedMediaUrlResponse> uploadUrl(@PathVariable Long id) { return ResponseEntity.ok(service.uploadUrl(id)); }
    @GetMapping("/{id}/download-url") @PreAuthorize("@permissionService.has(authentication, 'MEDIA_READ')")
    public ResponseEntity<SignedMediaUrlResponse> downloadUrl(@PathVariable Long id, Authentication auth) { return ResponseEntity.ok(service.downloadUrl(id, auth.getName())); }
    @PostMapping("/{id}/confirm") @PreAuthorize("@permissionService.has(authentication, 'MEDIA_MANAGE')")
    public ResponseEntity<MediaAssetResponse> confirm(@PathVariable Long id, Authentication auth) { return ResponseEntity.ok(service.confirm(id, auth.getName())); }
    @DeleteMapping("/{id}") @PreAuthorize("@permissionService.has(authentication, 'MEDIA_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication auth) { service.delete(id, auth.getName()); return ResponseEntity.noContent().build(); }
}
