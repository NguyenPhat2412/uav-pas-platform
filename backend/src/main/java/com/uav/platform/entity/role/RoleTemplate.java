package com.uav.platform.entity.role;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.enums.user.UserRole;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "role_templates")
@Getter
@Setter
@NoArgsConstructor
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
}
