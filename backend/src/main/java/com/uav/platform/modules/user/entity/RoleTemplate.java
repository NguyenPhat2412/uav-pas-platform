package com.uav.platform.modules.user.entity;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.common.entity.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "role_templates")
public class RoleTemplate extends BaseEntity {
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 30)
    private UserRole role;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "defaults_initialized", nullable = false, columnDefinition = "boolean default false")
    private boolean defaultsInitialized;

    protected RoleTemplate() {}

    public RoleTemplate(UserRole role, String name) {
        this.role = role;
        this.name = name;
    }

    public UserRole getRole() { return role; }
    public String getName() { return name; }
    public boolean isDefaultsInitialized() { return defaultsInitialized; }
    public void initializeDefaults() { defaultsInitialized = true; }
}
