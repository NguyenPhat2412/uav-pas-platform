package com.uav.platform.modules.user.entity;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Hibernate entity lưu trữ danh sách Access Token đã bị thu hồi (Blacklist/Revocation).
 * Khi người dùng bấm Logout, Access Token sẽ bị đưa vào danh sách này cho đến khi hết hạn tự nhiên.
 */
@Entity
@Table(name = "invalidated_tokens", indexes = {
        @Index(name = "idx_inv_token_id", columnList = "token_id", unique = true),
        @Index(name = "idx_inv_token_expiry", columnList = "expiry_time")
})
@Getter
@Setter
@NoArgsConstructor
public class InvalidatedToken extends BaseEntity {

    @Column(name = "token_id", nullable = false, unique = true, length = 255)
    private String tokenId;

    @Column(name = "expiry_time", nullable = false)
    private Instant expiryTime;

    public InvalidatedToken(String tokenId, Instant expiryTime) {
        this.tokenId = tokenId;
        this.expiryTime = expiryTime;
    }

}
