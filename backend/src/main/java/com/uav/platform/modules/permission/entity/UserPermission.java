package com.uav.platform.modules.permission.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.user.entity.AppUser;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "user_permissions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "permission_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserPermission extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;

    @Column(nullable = false)
    private boolean granted;

    public UserPermission(AppUser user, Permission permission, boolean granted) {
        this.user = user;
        this.permission = permission;
        this.granted = granted;
    }

    public void setGranted(boolean granted) {
        this.granted = granted;
    }
}
