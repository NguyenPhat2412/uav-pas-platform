package com.uav.platform.modules.security.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Per-user cut-off for admin-initiated session revocation: access tokens issued at or before
 * {@code revokedBefore} are rejected by the JWT filter.
 */
@Entity
@Table(name = "auth_session_revocations")
@Getter
@Setter
@NoArgsConstructor
public class SessionRevocation {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "revoked_before", nullable = false)
    private Instant revokedBefore;

    @Column(name = "revoked_by", length = 100)
    private String revokedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
