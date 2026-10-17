package com.uav.platform.modules.role.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.user.enums.UserRole;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "role_templates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoleTemplate extends BaseEntity {
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 30)
    private UserRole role;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(
            name = "defaults_initialized",
            nullable = false,
            columnDefinition = "boolean default false")
    private boolean defaultsInitialized;

    public RoleTemplate(UserRole role, String name) {
        this.role = role;
        this.name = name;
    }

    public void initializeDefaults() {
        defaultsInitialized = true;
    }
}
