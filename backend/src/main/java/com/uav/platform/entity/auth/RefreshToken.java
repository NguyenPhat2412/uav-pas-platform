package com.uav.platform.entity.auth;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.auth.ClientKind;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Hibernate entity lưu trữ và quản lý Refresh Token cho phiên làm việc của người dùng.
 * Kế thừa từ BaseEntity theo kiến trúc OOP, tự động quản lý id và audit timestamps.
 */
@Entity
@Table(
        name = "refresh_tokens",
        indexes = {
            @Index(name = "idx_refresh_token_token", columnList = "token", unique = true),
            @Index(name = "idx_refresh_token_user_id", columnList = "user_id")
        })
@Getter
@Setter
@NoArgsConstructor
public class RefreshToken extends BaseEntity {

    // One token per user and client kind (V37): the web portal and the mobile app sign in
    // independently.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ClientKind client = ClientKind.WEB;

    @Column(nullable = false, unique = true, length = 128)
    private String token;

    @Column(name = "expiry_date", nullable = false)
    private Instant expiryDate;

    @Column(nullable = false)
    private boolean revoked = false;

    public RefreshToken(AppUser user, String token, Instant expiryDate) {
        this(user, token, expiryDate, ClientKind.WEB);
    }

    public RefreshToken(AppUser user, String token, Instant expiryDate, ClientKind client) {
        this.user = user;
        this.token = token;
        this.expiryDate = expiryDate;
        this.client = client;
        this.revoked = false;
    }
}
