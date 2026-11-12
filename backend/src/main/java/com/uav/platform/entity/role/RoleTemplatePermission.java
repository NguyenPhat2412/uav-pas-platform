package com.uav.platform.entity.role;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.permission.Permission;

import jakarta.persistence.*;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "role_template_permissions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"role_template_id", "permission_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoleTemplatePermission extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_template_id", nullable = false)
    private RoleTemplate roleTemplate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;

    public RoleTemplatePermission(RoleTemplate roleTemplate, Permission permission) {
        this.roleTemplate = roleTemplate;
        this.permission = permission;
    }
}
