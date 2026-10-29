package com.uav.platform.modules.training.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.training.enums.TrainingAssetStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** A lesson video, slide image or course cover uploaded straight to the object store. */
@Entity
@Table(name = "training_assets")
@Getter
@Setter
@NoArgsConstructor
public class TrainingAsset extends BaseEntity {

    @Column(name = "object_key", nullable = false, unique = true, length = 400)
    private String objectKey;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private Long sizeBytes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TrainingAssetStatus status = TrainingAssetStatus.PENDING;

    @Column(name = "uploaded_by", length = 100)
    private String uploadedBy;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;
}
