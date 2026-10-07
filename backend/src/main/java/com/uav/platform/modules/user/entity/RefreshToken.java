package com.uav.platform.modules.user.entity;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.common.entity.BaseEntity;
import jakarta.persistence.*;

import java.time.Instant;

/**
 * Hibernate entity lưu trữ và quản lý Refresh Token cho phiên làm việc của người dùng.
 * Kế thừa từ BaseEntity theo kiến trúc OOP, tự động quản lý id và audit timestamps.
 */
@Entity
@Table(name = "refresh_tokens", indexes = {
        @Index(name = "idx_refresh_token_token", columnList = "token", unique = true),
        @Index(name = "idx_refresh_token_user_id", columnList = "user_id")
})
public class RefreshToken extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private AppUser user;

    @Column(nullable = false, unique = true, length = 128)
    private String token;

    @Column(name = "expiry_date", nullable = false)
    private Instant expiryDate;

    @Column(nullable = false)
    private boolean revoked = false;

    public RefreshToken() {}

    public RefreshToken(AppUser user, String token, Instant expiryDate) {
        this.user = user;
        this.token = token;
        this.expiryDate = expiryDate;
        this.revoked = false;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(this.expiryDate);
    }

    public boolean isValid() {
        return !this.revoked && !isExpired();
    }

    public void revoke() {
        this.revoked = true;
    }

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Instant getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(Instant expiryDate) {
        this.expiryDate = expiryDate;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public void setRevoked(boolean revoked) {
        this.revoked = revoked;
    }
}
