package com.uav.platform.modules.user.entity;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

@Entity
@Table(name = "permissions")
public class Permission extends BaseEntity {
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 50)
    private PermissionCode code;

    @Column(length = 255)
    private String description;

    protected Permission() {}

    public Permission(PermissionCode code, String description) {
        this.code = code;
        this.description = description;
    }

    public PermissionCode getCode() { return code; }
    public String getDescription() { return description; }
}
