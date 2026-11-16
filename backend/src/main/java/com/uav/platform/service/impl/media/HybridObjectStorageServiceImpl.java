package com.uav.platform.service.impl.media;

import com.uav.platform.dto.record.media.ObjectMetadata;
import com.uav.platform.dto.record.media.ObjectStream;
import com.uav.platform.dto.record.media.StorageUsage;
import com.uav.platform.dto.record.storage.pool.DriveUploadedFile;
import com.uav.platform.entity.storage.StorageDriveNode;
import com.uav.platform.entity.storage.StorageDriveObject;
import com.uav.platform.enums.storage.DriveNodeHealth;
import com.uav.platform.enums.storage.StorageBackendMode;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.storage.StorageDriveNodeRepository;
import com.uav.platform.repository.storage.StorageDriveObjectRepository;
import com.uav.platform.service.impl.storage.pool.GoogleDriveClientOperations;
import com.uav.platform.service.impl.storage.pool.StorageAllocationOperations;
import com.uav.platform.service.media.ObjectStorageService;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

/**
 * Primary {@link ObjectStorageService} router combining a multi-account Google Drive pool with the
 * existing S3/Cloudflare R2 backend. Existing R2 objects remain readable and migratable while new
 * uploads route dynamically according to the active storage pool policy.
 */
@Slf4j
@Service
public class HybridObjectStorageServiceImpl implements ObjectStorageService {
    private final S3CompatibleStorageService r2Delegate;
    private final StorageDriveNodeRepository driveNodes;
    private final StorageDriveObjectRepository driveObjects;
    private final StorageAllocationOperations allocator;
    private final GoogleDriveClientOperations driveClient;

    @Autowired
    public HybridObjectStorageServiceImpl(
            @Value("${app.storage.provider:minio}") String provider,
            @Value("${app.storage.endpoint:http://localhost:9000}") String endpoint,
            @Value("${app.storage.bucket:uav-pas}") String bucket,
            @Value("${app.storage.access-key:minioadmin}") String accessKey,
            @Value("${app.storage.secret-key:minioadmin}") String secretKey,
            @Value("${app.storage.region:us-east-1}") String region,
            @Value("${app.storage.public-endpoint:}") String publicEndpoint,
            @Value("${app.storage.ensure-bucket:false}") boolean ensureBucket,
            @Value("${app.storage.cors-origin:http://localhost:3000}") String corsOrigin,
            @Value("${app.cors.allowed-origins:}") String appCorsAllowedOrigins,
            StorageDriveNodeRepository driveNodes,
            StorageDriveObjectRepository driveObjects,
            StorageAllocationOperations allocator,
            GoogleDriveClientOperations driveClient) {
        this(
                new S3CompatibleStorageService(
                        provider,
                        endpoint,
                        bucket,
                        accessKey,
                        secretKey,
                        region,
                        publicEndpoint,
                        ensureBucket,
                        corsOrigin,
                        appCorsAllowedOrigins),
                driveNodes,
                driveObjects,
                allocator,
                driveClient);
    }

    public HybridObjectStorageServiceImpl(
            S3CompatibleStorageService r2Delegate,
            StorageDriveNodeRepository driveNodes,
            StorageDriveObjectRepository driveObjects,
            StorageAllocationOperations allocator,
            GoogleDriveClientOperations driveClient) {
        this.r2Delegate = r2Delegate;
        this.driveNodes = driveNodes;
        this.driveObjects = driveObjects;
        this.allocator = allocator;
        this.driveClient = driveClient;
    }

    @PostConstruct
    void init() {
        r2Delegate.initializeBucket();
    }

    @PreDestroy
    void shutdown() {
        r2Delegate.closeClients();
    }

    public S3CompatibleStorageService r2Delegate() {
        return r2Delegate;
    }

    @Override
    public String provider() {
        StorageBackendMode mode = allocator.primaryBackend();
        if (mode == StorageBackendMode.R2) return r2Delegate.provider();
        List<StorageDriveNode> active =
                driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc();
        if (active.isEmpty()) return r2Delegate.provider();
        return mode == StorageBackendMode.HYBRID_TIERED
                ? "google-drive+" + r2Delegate.provider()
                : "google-drive";
    }

    @Override
    public String createSignedUploadUrl(String objectKey, String contentType) {
        return createSignedUploadUrl(objectKey, contentType, 0L, Duration.ofMinutes(15));
    }

    @Override
    public String createSignedUploadUrl(
            String objectKey, String contentType, long size, Duration validity) {
        Optional<StorageDriveNode> node = allocator.selectNode(objectKey, contentType, size);
        if (node.isPresent()) {
            return allocator.buildSignedGatewayUploadUrl(
                    node.get().getCode(), objectKey, contentType, size, validity);
        }
        if (allocator.primaryBackend() == StorageBackendMode.R2 || allocator.fallbackToR2()) {
            return r2Delegate.createSignedUploadUrl(objectKey, contentType, size, validity);
        }
        throw SystemException.serviceUnavailable(
                "Tất cả ổ Google Drive đã đầy hoặc đang tạm ngưng và dự phòng R2 đang tắt.",
                "DRIVE_POOL_EXHAUSTED");
    }

    @Override
    public void uploadObject(String objectKey, String contentType, long size, InputStream body) {
        Optional<StorageDriveNode> selected = allocator.selectNode(objectKey, contentType, size);
        if (selected.isPresent()) {
            StorageDriveNode node = selected.get();
            DriveUploadedFile uploaded =
                    driveClient.uploadStream(node, objectKey, contentType, size, body);
            StorageDriveObject record =
                    driveObjects.findByObjectKey(objectKey).orElseGet(StorageDriveObject::new);
            record.setObjectKey(objectKey);
            record.setNode(node);
            record.setDriveFileId(uploaded.driveFileId());
            record.setDriveFolderId(uploaded.driveFolderId());
            record.setModuleFolder(uploaded.moduleFolder());
            record.setFileName(uploaded.fileName());
            record.setContentType(uploaded.contentType());
            record.setSizeBytes(uploaded.sizeBytes());
            driveObjects.save(record);
            if (node.getQuotaUsedBytes() != null) {
                node.setQuotaUsedBytes(node.getQuotaUsedBytes() + uploaded.sizeBytes());
            }
            node.setHealthStatus(DriveNodeHealth.UP);
            driveNodes.save(node);
            return;
        }
        if (allocator.primaryBackend() == StorageBackendMode.R2 || allocator.fallbackToR2()) {
            r2Delegate.uploadObject(objectKey, contentType, size, body);
            return;
        }
        throw SystemException.serviceUnavailable(
                "Tất cả ổ Google Drive đã đầy hoặc chưa sẵn sàng.", "DRIVE_POOL_EXHAUSTED");
    }

    @Override
    public String createSignedDownloadUrl(String objectKey) {
        return createSignedDownloadUrl(objectKey, Duration.ofMinutes(15));
    }

    @Override
    public String createSignedDownloadUrl(String objectKey, Duration validity) {
        if (driveObjects.existsByObjectKey(objectKey)) {
            return allocator.buildSignedGatewayDownloadUrl(objectKey, validity);
        }
        return r2Delegate.createSignedDownloadUrl(objectKey, validity);
    }

    @Override
    public boolean objectExists(String objectKey) {
        Optional<StorageDriveObject> mapped = driveObjects.findByObjectKey(objectKey);
        if (mapped.isPresent()) {
            StorageDriveObject obj = mapped.get();
            return driveClient
                    .headFile(obj.getNode(), obj.getDriveFileId(), obj.getContentType())
                    .isPresent();
        }
        return r2Delegate.objectExists(objectKey);
    }

    @Override
    public ObjectMetadata metadata(String objectKey) {
        Optional<StorageDriveObject> mapped = driveObjects.findByObjectKey(objectKey);
        if (mapped.isPresent()) {
            StorageDriveObject obj = mapped.get();
            return driveClient
                    .headFile(obj.getNode(), obj.getDriveFileId(), obj.getContentType())
                    .orElseThrow(
                            () ->
                                    SystemException.notFound(
                                            "Không tìm thấy tệp trên Google Drive.",
                                            "FILE_NOT_FOUND"));
        }
        return r2Delegate.metadata(objectKey);
    }

    @Override
    public byte[] readHeader(String objectKey) {
        Optional<StorageDriveObject> mapped = driveObjects.findByObjectKey(objectKey);
        if (mapped.isPresent()) {
            StorageDriveObject obj = mapped.get();
            return driveClient.readHeader(
                    obj.getNode(), obj.getDriveFileId(), obj.getContentType());
        }
        return r2Delegate.readHeader(objectKey);
    }

    @Override
    public ObjectStream openStream(String objectKey, String range) {
        Optional<StorageDriveObject> mapped = driveObjects.findByObjectKey(objectKey);
        if (mapped.isPresent()) {
            StorageDriveObject obj = mapped.get();
            return driveClient.openStream(
                    obj.getNode(), obj.getDriveFileId(), obj.getContentType(), range);
        }
        return r2Delegate.openStream(objectKey, range);
    }

    @Override
    public void deleteObject(String objectKey) {
        Optional<StorageDriveObject> mapped = driveObjects.findByObjectKey(objectKey);
        if (mapped.isPresent()) {
            StorageDriveObject obj = mapped.get();
            StorageDriveNode node = obj.getNode();
            driveClient.deleteFile(node, obj.getDriveFileId());
            driveObjects.delete(obj);
            if (node.getQuotaUsedBytes() != null) {
                node.setQuotaUsedBytes(Math.max(0L, node.getQuotaUsedBytes() - obj.getSizeBytes()));
                driveNodes.save(node);
            }
            return;
        }
        r2Delegate.deleteObject(objectKey);
    }

    @Override
    public boolean bucketReachable() {
        List<StorageDriveNode> active =
                driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc();
        boolean anyDriveUp =
                active.stream().anyMatch(n -> n.getHealthStatus() != DriveNodeHealth.DOWN);
        if (allocator.primaryBackend() != StorageBackendMode.R2 && anyDriveUp) {
            return true;
        }
        return r2Delegate.bucketReachable();
    }

    @Override
    public StorageUsage usage(long maxObjects) {
        long driveCount = driveObjects.count();
        long driveBytes = driveCount == 0 ? 0L : driveObjects.sumAllBytes();
        try {
            StorageUsage r2Usage = r2Delegate.usage(Math.max(1L, maxObjects - driveCount));
            return new StorageUsage(
                    driveCount + r2Usage.objectCount(),
                    driveBytes + r2Usage.totalBytes(),
                    r2Usage.truncated());
        } catch (RuntimeException ex) {
            if (driveCount > 0
                    || !driveNodes.findByEnabledTrueOrderByPriorityWeightDescIdAsc().isEmpty()) {
                return new StorageUsage(driveCount, driveBytes, false);
            }
            throw ex;
        }
    }
}
