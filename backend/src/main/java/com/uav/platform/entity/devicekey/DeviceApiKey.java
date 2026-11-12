package com.uav.platform.entity.devicekey;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Machine credential for telemetry ingestion. Only the SHA-256 digest of the key is stored. */
@Entity
@Table(name = "device_api_keys")
@Getter
@Setter
@NoArgsConstructor
public class DeviceApiKey {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    /** When set, the key may only report telemetry for this UAV. */
    @Column(name = "uav_id")
    private Long uavId;

    @Column(name = "key_prefix", nullable = false, length = 16)
    private String keyPrefix;

    @Column(name = "key_hash", nullable = false, unique = true, length = 64)
    private String keyHash;

    /** Comma-separated scope names; only TELEMETRY_WRITE exists today. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String scopes;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;
}
