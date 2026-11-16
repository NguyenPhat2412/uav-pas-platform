package com.uav.platform.controller.storage.pool;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.storage.pool.GoogleOAuthAuthorizeRequest;
import com.uav.platform.dto.request.storage.pool.GoogleOAuthConfigRequest;
import com.uav.platform.dto.request.storage.pool.StorageDriveNodeCreateRequest;
import com.uav.platform.dto.request.storage.pool.StorageDriveNodeUpdateRequest;
import com.uav.platform.dto.request.storage.pool.StoragePoolPolicyRequest;
import com.uav.platform.dto.request.storage.pool.StorageR2MigrationRequest;
import com.uav.platform.dto.response.storage.pool.GoogleOAuthAuthorizeResponse;
import com.uav.platform.dto.response.storage.pool.StorageDriveNodeResponse;
import com.uav.platform.dto.response.storage.pool.StoragePoolOverviewResponse;
import com.uav.platform.dto.response.storage.pool.StorageR2MigrationResponse;
import com.uav.platform.service.storage.pool.StoragePoolService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping(ApiRoutes.Admin.STORAGE_POOL)
@RequiredArgsConstructor
public class StoragePoolController {
    private static final String MANAGE =
            "@permissionService.has(authentication, 'USER_PERMISSION_MANAGE')";

    private final StoragePoolService pool;

    @GetMapping
    @PreAuthorize(MANAGE)
    public ResponseEntity<StoragePoolOverviewResponse> overview() {
        return ResponseEntity.ok(pool.overview());
    }

    @PutMapping(ApiRoutes.Admin.STORAGE_POOL_POLICY)
    @PreAuthorize(MANAGE)
    public ResponseEntity<StoragePoolOverviewResponse> updatePolicy(
            @Valid @RequestBody StoragePoolPolicyRequest request, Authentication auth) {
        return ResponseEntity.ok(pool.updatePolicy(request, auth.getName()));
    }

    @PutMapping(ApiRoutes.Admin.STORAGE_POOL_OAUTH_CONFIG)
    @PreAuthorize(MANAGE)
    public ResponseEntity<StoragePoolOverviewResponse> saveOAuthConfig(
            @Valid @RequestBody GoogleOAuthConfigRequest request, Authentication auth) {
        return ResponseEntity.ok(pool.saveOAuthConfig(request, auth.getName()));
    }

    @PostMapping(ApiRoutes.Admin.STORAGE_POOL_OAUTH_AUTHORIZE)
    @PreAuthorize(MANAGE)
    public ResponseEntity<GoogleOAuthAuthorizeResponse> createAuthorizeUrl(
            @Valid @RequestBody(required = false) GoogleOAuthAuthorizeRequest request,
            Authentication auth) {
        return ResponseEntity.ok(pool.createOAuthAuthorizeUrl(request, auth.getName()));
    }

    /** Public browser redirect target from Google OAuth 2.0 consent; validated via HMAC state. */
    @GetMapping(ApiRoutes.Admin.STORAGE_POOL_OAUTH_CALLBACK)
    public ResponseEntity<Void> oauthCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error) {
        URI redirect = pool.completeOAuthCallback(code, state, error);
        return ResponseEntity.status(HttpStatus.FOUND).location(redirect).build();
    }

    @PostMapping(ApiRoutes.Admin.STORAGE_POOL_NODES)
    @PreAuthorize(MANAGE)
    public ResponseEntity<StorageDriveNodeResponse> createNode(
            @Valid @RequestBody StorageDriveNodeCreateRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pool.createNode(request, auth.getName()));
    }

    @PutMapping(ApiRoutes.Admin.STORAGE_POOL_NODE_BY_ID)
    @PreAuthorize(MANAGE)
    public ResponseEntity<StorageDriveNodeResponse> updateNode(
            @PathVariable Long id,
            @Valid @RequestBody StorageDriveNodeUpdateRequest request,
            Authentication auth) {
        return ResponseEntity.ok(pool.updateNode(id, request, auth.getName()));
    }

    @PostMapping(ApiRoutes.Admin.STORAGE_POOL_NODE_SYNC)
    @PreAuthorize(MANAGE)
    public ResponseEntity<StorageDriveNodeResponse> syncNode(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(pool.syncNode(id, auth.getName()));
    }

    @DeleteMapping(ApiRoutes.Admin.STORAGE_POOL_NODE_BY_ID)
    @PreAuthorize(MANAGE)
    public ResponseEntity<Void> deleteNode(@PathVariable Long id, Authentication auth) {
        pool.deleteNode(id, auth.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping(ApiRoutes.Admin.STORAGE_POOL_MIGRATE_R2)
    @PreAuthorize(MANAGE)
    public ResponseEntity<StorageR2MigrationResponse> migrateFromR2(
            @Valid @RequestBody(required = false) StorageR2MigrationRequest request,
            Authentication auth) {
        return ResponseEntity.ok(pool.migrateFromR2(request, auth.getName()));
    }

    @PostMapping(ApiRoutes.Admin.STORAGE_POOL_MIGRATE_FILE)
    @PreAuthorize(MANAGE)
    public ResponseEntity<StorageR2MigrationResponse> migrateSingleFile(
            @RequestParam("fileId") String fileId,
            @RequestParam(defaultValue = "false") boolean deleteSourceFromR2,
            Authentication auth) {
        return ResponseEntity.ok(
                pool.migrateSingleFile(fileId, deleteSourceFromR2, auth.getName()));
    }
}
