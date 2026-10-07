package com.uav.platform.modules.user.entity;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Hibernate entity lưu trữ danh sách Access Token đã bị thu hồi (Blacklist/Revocation).
 * Khi người dùng bấm Logout, Access Token sẽ bị đưa vào danh sách này cho đến khi hết hạn tự nhiên.
 */
@Entity
@Table(name = "invalidated_tokens", indexes = {
        @Index(name = "idx_inv_token_id", columnList = "token_id", unique = true),
        @Index(name = "idx_inv_token_expiry", columnList = "expiry_time")
})
public class InvalidatedToken extends BaseEntity {

    @Column(name = "token_id", nullable = false, unique = true, length = 255)
    private String tokenId;

    @Column(name = "expiry_time", nullable = false)
    private Instant expiryTime;

    public InvalidatedToken() {}

    public InvalidatedToken(String tokenId, Instant expiryTime) {
        this.tokenId = tokenId;
        this.expiryTime = expiryTime;
    }

    public String getTokenId() {
        return tokenId;
    }

    public void setTokenId(String tokenId) {
        this.tokenId = tokenId;
    }

    public Instant getExpiryTime() {
        return expiryTime;
    }

    public void setExpiryTime(Instant expiryTime) {
        this.expiryTime = expiryTime;
    }
}
