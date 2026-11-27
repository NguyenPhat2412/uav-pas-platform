package com.uav.platform.service;

import com.uav.platform.dto.request.GoogleOAuthAuthorizeRequest;
import com.uav.platform.dto.request.GoogleOAuthConfigRequest;
import com.uav.platform.dto.request.StorageDriveNodeCreateRequest;
import com.uav.platform.dto.request.StorageDriveNodeUpdateRequest;
import com.uav.platform.dto.request.StoragePoolPolicyRequest;
import com.uav.platform.dto.request.StorageR2MigrationRequest;
import com.uav.platform.dto.response.GoogleOAuthAuthorizeResponse;
import com.uav.platform.dto.response.StorageDriveNodeResponse;
import com.uav.platform.dto.response.StoragePoolOverviewResponse;
import com.uav.platform.dto.response.StorageR2MigrationResponse;

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
