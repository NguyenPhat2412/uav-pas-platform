package com.uav.platform.modules.permission.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.permission.enums.PermissionCode;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "permissions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Permission extends BaseEntity {
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 50)
    private PermissionCode code;

    @Column(length = 255)
    private String description;

    public Permission(PermissionCode code, String description) {
        this.code = code;
        this.description = description;
    }
}
