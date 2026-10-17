package com.uav.platform.modules.media.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.media.enums.*;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "media_assets")
@Getter
@Setter
@NoArgsConstructor
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

    @Column(name = "delete_attempts", nullable = false)
    private int deleteAttempts;

    @Column(name = "delete_after")
    private LocalDateTime deleteAfter;

    @Column(name = "object_deleted_at")
    private LocalDateTime objectDeletedAt;

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
}
