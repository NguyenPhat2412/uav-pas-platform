package com.uav.platform.modules.media.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.media.enums.*;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "media_assets")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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

    @Column(name = "upload_valid_until")
    private LocalDateTime uploadValidUntil;

    public void recordUploadUntil(LocalDateTime until) {
        if (uploadValidUntil == null || until.isAfter(uploadValidUntil)) uploadValidUntil = until;
    }

    @Column(name = "delete_attempts", nullable = false)
    private int deleteAttempts;

    @Column(name = "delete_after")
    private LocalDateTime deleteAfter;

    @Column(name = "object_deleted_at")
    private LocalDateTime objectDeletedAt;

    public void queueDeletion(LocalDateTime now) {
        deleted = true;
        // Delay deletion until issued signed PUTs cannot recreate the object.
        if (deleteAfter == null)
            deleteAfter =
                    uploadValidUntil != null && uploadValidUntil.isAfter(now)
                            ? uploadValidUntil
                            : now;
    }

    public void deletionSucceeded(LocalDateTime now) {
        objectDeletedAt = now;
        // S3 validates expiry when a PUT starts. A previously admitted stream may finish later.
        // Retain a low-frequency tombstone sweep so late completion cannot leak a deleted file.
        deleteAfter = now.plusHours(24);
    }

    public void deletionFailed(LocalDateTime now) {
        deleteAttempts = Math.min(deleteAttempts + 1, 30);
        deleteAfter = now.plusSeconds(Math.min(3600L, 30L << Math.min(deleteAttempts - 1, 7)));
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void markDeleted() {
        deleted = true;
    }

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    public MediaAsset(
            String originalName,
            String objectKey,
            String contentType,
            long size,
            MediaType type,
            String linkedEntityType,
            String linkedEntityId,
            String uploadedBy,
            String storageProvider) {
        this.originalName = originalName;
        this.objectKey = objectKey;
        this.contentType = contentType;
        this.size = size;
        this.type = type;
        this.linkedEntityType = linkedEntityType;
        this.linkedEntityId = linkedEntityId;
        this.uploadedBy = uploadedBy;
        this.storageProvider = storageProvider;
    }

    public void confirm() {
        this.confirmed = true;
        this.confirmedAt = LocalDateTime.now();
    }
}
