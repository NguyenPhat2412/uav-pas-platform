package com.uav.platform.service.storage.pool;

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

import java.net.URI;

public interface StoragePoolService {
    StoragePoolOverviewResponse overview();

    StoragePoolOverviewResponse updatePolicy(StoragePoolPolicyRequest request, String actor);

    StoragePoolOverviewResponse saveOAuthConfig(GoogleOAuthConfigRequest request, String actor);

    GoogleOAuthAuthorizeResponse createOAuthAuthorizeUrl(
            GoogleOAuthAuthorizeRequest request, String actor);

    URI completeOAuthCallback(String code, String state, String error);

    StorageDriveNodeResponse createNode(StorageDriveNodeCreateRequest request, String actor);

    StorageDriveNodeResponse updateNode(
            Long id, StorageDriveNodeUpdateRequest request, String actor);

    StorageDriveNodeResponse syncNode(Long id, String actor);

    void deleteNode(Long id, String actor);

    StorageR2MigrationResponse migrateFromR2(StorageR2MigrationRequest request, String actor);

    StorageR2MigrationResponse migrateSingleFile(
            String fileId, boolean deleteSourceFromR2, String actor);
}
