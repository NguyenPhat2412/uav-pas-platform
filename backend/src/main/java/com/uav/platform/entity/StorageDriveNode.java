package com.uav.platform.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.enums.DriveAuthType;
import com.uav.platform.enums.DriveNodeHealth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "storage_drive_nodes")
@Getter
@Setter
@NoArgsConstructor
public class StorageDriveNode extends BaseEntity {
    @Column(nullable = false, unique = true, length = 60)
    private String code;

    @Column(name = "display_name", nullable = false, length = 140)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_type", nullable = false, length = 24)
    private DriveAuthType authType = DriveAuthType.OAUTH2;

    @Column(name = "account_email", length = 180)
    private String accountEmail;

    @Column(name = "encrypted_credentials", nullable = false, columnDefinition = "TEXT")
    private String encryptedCredentials;

    @Column(name = "root_folder_id", length = 160)
    private String rootFolderId;

    @Column(name = "folder_cache_json", columnDefinition = "TEXT")
    private String folderCacheJson;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "priority_weight", nullable = false)
    private int priorityWeight = 100;

    @Column(name = "max_usage_percent", nullable = false)
    private int maxUsagePercent = 92;

    @Column(name = "routed_modules", nullable = false, length = 300)
    private String routedModules = "ALL";

    @Column(name = "quota_limit_bytes")
    private Long quotaLimitBytes;

    @Column(name = "quota_used_bytes")
    private Long quotaUsedBytes;

    @Column(name = "quota_drive_bytes")
    private Long quotaDriveBytes;

    @Enumerated(EnumType.STRING)
    @Column(name = "health_status", nullable = false, length = 20)
    private DriveNodeHealth healthStatus = DriveNodeHealth.UNKNOWN;

    @Column(name = "last_error", length = 240)
    private String lastError;

    @Column(name = "last_checked_at")
    private LocalDateTime lastCheckedAt;
}
