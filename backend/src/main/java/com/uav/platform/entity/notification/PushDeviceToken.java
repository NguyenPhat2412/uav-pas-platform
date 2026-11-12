package com.uav.platform.entity.notification;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.notification.PushPlatform;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "push_device_tokens",
        uniqueConstraints = @UniqueConstraint(name = "uk_push_device_token", columnNames = "token"))
@Getter
@Setter
@NoArgsConstructor
public class PushDeviceToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false, unique = true, length = 255)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PushPlatform platform;

    @Column(name = "device_name", length = 120)
    private String deviceName;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;
}
