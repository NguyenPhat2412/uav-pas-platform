package com.uav.platform.modules.media.entity;


import com.uav.platform.modules.media.common.*;

import com.uav.platform.common.entity.BaseEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "media_assets")
public class MediaAsset extends BaseEntity {
    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;
    @Column(name = "object_key", nullable = false, unique = true, length = 500)
    private String objectKey;
    @Column(name = "content_type", nullable = false, length = 120)
    private String contentType;
    @Column(nullable = false)
    private long size;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MediaType type;
    @Column(name = "linked_entity_type", length = 80)
    private String linkedEntityType;
    @Column(name = "linked_entity_id", length = 80)
    private String linkedEntityId;
    @Column(name = "uploaded_by", length = 100)
    private String uploadedBy;
    @Column(nullable = false, length = 30)
    private String storageProvider;
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean confirmed;
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted;
    public boolean isDeleted() { return deleted; }
    public void markDeleted() { deleted=true; }
    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    protected MediaAsset() {}
    public MediaAsset(String originalName, String objectKey, String contentType, long size, MediaType type,
                      String linkedEntityType, String linkedEntityId, String uploadedBy, String storageProvider) {
        this.originalName = originalName; this.objectKey = objectKey; this.contentType = contentType; this.size = size; this.type = type;
        this.linkedEntityType = linkedEntityType; this.linkedEntityId = linkedEntityId; this.uploadedBy = uploadedBy; this.storageProvider = storageProvider;
    }
    public String getOriginalName() { return originalName; }
    public String getObjectKey() { return objectKey; }
    public String getContentType() { return contentType; }
    public long getSize() { return size; }
    public MediaType getType() { return type; }
    public String getLinkedEntityType() { return linkedEntityType; }
    public String getLinkedEntityId() { return linkedEntityId; }
    public String getUploadedBy() { return uploadedBy; }
    public String getStorageProvider() { return storageProvider; }
    public boolean isConfirmed() { return confirmed; }
    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public void confirm() { this.confirmed = true; this.confirmedAt = LocalDateTime.now(); }
}
