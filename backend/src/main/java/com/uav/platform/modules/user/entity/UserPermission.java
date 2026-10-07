package com.uav.platform.modules.user.entity;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.common.entity.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "user_permissions", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "permission_id"}))
public class UserPermission extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;

    @Column(nullable = false)
    private boolean granted;

    protected UserPermission() {}

    public UserPermission(AppUser user, Permission permission, boolean granted) {
        this.user = user;
        this.permission = permission;
        this.granted = granted;
    }

    public AppUser getUser() { return user; }
    public Permission getPermission() { return permission; }
    public boolean isGranted() { return granted; }
    public void setGranted(boolean granted) { this.granted = granted; }
}
