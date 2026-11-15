package com.uav.platform.entity.storage;

import com.uav.platform.common.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "storage_drive_objects")
@Getter
@Setter
@NoArgsConstructor
public class StorageDriveObject extends BaseEntity {
    @Column(name = "object_key", nullable = false, unique = true, length = 500)
    private String objectKey;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "node_id", nullable = false)
    private StorageDriveNode node;

    @Column(name = "drive_file_id", nullable = false, length = 160)
    private String driveFileId;

    @Column(name = "drive_folder_id", length = 160)
    private String driveFolderId;

    @Column(name = "module_folder", length = 60)
    private String moduleFolder;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", nullable = false, length = 120)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;
}
