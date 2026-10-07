package com.uav.platform.modules.user.entity;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.common.entity.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "role_template_permissions", uniqueConstraints = @UniqueConstraint(columnNames = {"role_template_id", "permission_id"}))
public class RoleTemplatePermission extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_template_id", nullable = false)
    private RoleTemplate roleTemplate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;

    protected RoleTemplatePermission() {}

    public RoleTemplatePermission(RoleTemplate roleTemplate, Permission permission) {
        this.roleTemplate = roleTemplate;
        this.permission = permission;
    }

    public RoleTemplate getRoleTemplate() { return roleTemplate; }
    public Permission getPermission() { return permission; }
}
