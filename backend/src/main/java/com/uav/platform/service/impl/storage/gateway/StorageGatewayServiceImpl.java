package com.uav.platform.service.impl.storage.gateway;

import com.uav.platform.dto.record.media.ObjectStream;
import com.uav.platform.dto.record.storage.pool.DriveUploadedFile;
import com.uav.platform.entity.storage.StorageDriveNode;
import com.uav.platform.entity.storage.StorageDriveObject;
import com.uav.platform.enums.storage.DriveNodeHealth;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.media.MediaAssetRepository;
import com.uav.platform.repository.storage.StorageDriveNodeRepository;
import com.uav.platform.repository.storage.StorageDriveObjectRepository;
import com.uav.platform.service.impl.storage.pool.GoogleDriveClientOperations;
import com.uav.platform.service.impl.storage.pool.StorageAllocationOperations;
import com.uav.platform.service.storage.gateway.StorageGatewayService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageGatewayServiceImpl implements StorageGatewayService {
    private final StorageAllocationOperations allocator;
    private final StorageDriveNodeRepository driveNodes;
    private final StorageDriveObjectRepository driveObjects;
    private final MediaAssetRepository mediaAssets;
    private final GoogleDriveClientOperations driveClient;

    @Override
    @Transactional
    public void uploadSigned(
            String nodeCode,
            String objectKey,
            String contentType,
            long size,
            Long exp,
            String sig,
            String ifNoneMatch,
            InputStream body) {
        String safeCt =
                StringUtils.hasText(contentType) ? contentType.trim() : "application/octet-stream";
        if (!allocator.verifyUploadSignature(nodeCode, objectKey, safeCt, size, exp, sig)) {
            throw SystemException.forbidden(
                    "Liên kết tải tệp lên đã hết hạn hoặc chữ ký không hợp lệ.",
                    "STORAGE_UPLOAD_FORBIDDEN");
        }
        if ("*".equals(ifNoneMatch) && driveObjects.existsByObjectKey(objectKey)) {
            throw SystemException.conflict(
                    "Tệp đã được tải lên trước đó.", "STORAGE_OBJECT_ALREADY_EXISTS");
        }
        StorageDriveNode node =
                driveNodes
                        .findByCode(nodeCode)
                        .orElseThrow(
                                () ->
                                        SystemException.serviceUnavailable(
                                                "Ổ Google Drive đích không còn tồn tại.",
                                                "DRIVE_NODE_NOT_FOUND"));
        if (!node.isEnabled()) {
            throw SystemException.serviceUnavailable(
                    "Ổ Google Drive đích đang tạm dừng.", "DRIVE_NODE_DISABLED");
        }

        DriveUploadedFile uploaded =
                driveClient.uploadStream(
                        node, objectKey, safeCt, size, new BoundedStream(body, size));
        StorageDriveObject obj =
                driveObjects.findByObjectKey(objectKey).orElseGet(StorageDriveObject::new);
        obj.setObjectKey(objectKey);
        obj.setNode(node);
        obj.setDriveFileId(uploaded.driveFileId());
        obj.setDriveFolderId(uploaded.driveFolderId());
        obj.setModuleFolder(uploaded.moduleFolder());
        obj.setFileName(uploaded.fileName());
        obj.setContentType(uploaded.contentType());
        obj.setSizeBytes(uploaded.sizeBytes());
        driveObjects.save(obj);

        if (node.getQuotaUsedBytes() != null) {
            node.setQuotaUsedBytes(node.getQuotaUsedBytes() + uploaded.sizeBytes());
        }
        node.setHealthStatus(DriveNodeHealth.UP);
        node.setLastError(null);
        driveNodes.save(node);

        mediaAssets
                .findByObjectKey(objectKey)
                .ifPresent(
                        asset -> {
                            String tag = "gdrive:" + node.getCode();
                            asset.setStorageProvider(
                                    tag.length() > 30 ? tag.substring(0, 30) : tag);
                            mediaAssets.save(asset);
                        });
    }

    @Override
    @Transactional(readOnly = true)
    public ResponseEntity<StreamingResponseBody> downloadSigned(
            String objectKey, String range, boolean headOnly, Long exp, String sig) {
        if (!allocator.verifyDownloadSignature(objectKey, exp, sig)) {
            throw SystemException.forbidden(
                    "Liên kết tải tệp không hợp lệ hoặc đã hết hạn.", "STORAGE_DOWNLOAD_FORBIDDEN");
        }
        StorageDriveObject obj =
                driveObjects
                        .findByObjectKey(objectKey)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Không tìm thấy tệp trong kho Google Drive.",
                                                "FILE_NOT_FOUND"));

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.ACCEPT_RANGES, "bytes");
        headers.set(HttpHeaders.CACHE_CONTROL, "private, max-age=900");
        headers.setContentDisposition(
                ContentDisposition.inline()
                        .filename(obj.getFileName(), StandardCharsets.UTF_8)
                        .build());
        headers.setContentType(parseMediaType(obj.getContentType()));

        String normalizedRange = StringUtils.hasText(range) ? range.trim() : null;
        if (headOnly && normalizedRange == null) {
            if (obj.getSizeBytes() >= 0) {
                headers.setContentLength(obj.getSizeBytes());
            }
            return new ResponseEntity<>(out -> {}, headers, HttpStatus.OK);
        }

        ObjectStream stream =
                driveClient.openStream(
                        obj.getNode(), obj.getDriveFileId(), obj.getContentType(), normalizedRange);
        if (StringUtils.hasText(stream.contentType())) {
            headers.setContentType(parseMediaType(stream.contentType()));
        }
        if (stream.contentLength() >= 0) {
            headers.setContentLength(stream.contentLength());
        }
        if (StringUtils.hasText(stream.contentRange())) {
            headers.set(HttpHeaders.CONTENT_RANGE, stream.contentRange());
        }
        if (StringUtils.hasText(stream.eTag())) {
            headers.set(HttpHeaders.ETAG, stream.eTag());
        }
        HttpStatus status =
                StringUtils.hasText(stream.contentRange())
                        ? HttpStatus.PARTIAL_CONTENT
                        : HttpStatus.OK;

        if (headOnly) {
            try {
                stream.close();
            } catch (IOException ignored) {
            }
            return new ResponseEntity<>(out -> {}, headers, status);
        }

        StreamingResponseBody body =
                output -> {
                    try (ObjectStream s = stream) {
                        s.body().transferTo(output);
                    }
                };
        return new ResponseEntity<>(body, headers, status);
    }

    private static MediaType parseMediaType(String raw) {
        if (!StringUtils.hasText(raw)) return MediaType.APPLICATION_OCTET_STREAM;
        try {
            return MediaType.parseMediaType(raw);
        } catch (InvalidMediaTypeException ex) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    private static final class BoundedStream extends InputStream {
        private final InputStream delegate;
        private long remaining;

        BoundedStream(InputStream delegate, long limit) {
            this.delegate = delegate;
            this.remaining = Math.max(0L, limit);
        }

        @Override
        public int read() throws IOException {
            if (remaining <= 0) return -1;
            int b = delegate.read();
            if (b != -1) remaining--;
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (remaining <= 0) return -1;
            int max = (int) Math.min(len, remaining);
            int n = delegate.read(b, off, max);
            if (n > 0) remaining -= n;
            return n;
        }

        @Override
        public void close() throws IOException {
            delegate.close();
        }
    }
}
