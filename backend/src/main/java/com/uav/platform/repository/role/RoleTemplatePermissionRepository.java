package com.uav.platform.repository.role;

import com.uav.platform.entity.role.RoleTemplatePermission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface RoleTemplatePermissionRepository
        extends JpaRepository<RoleTemplatePermission, Long>,
                JpaSpecificationExecutor<RoleTemplatePermission> {
    Optional<RoleTemplatePermission> findByRoleTemplateIdAndPermissionCode(
            Long roleTemplateId, com.uav.platform.enums.permission.PermissionCode code);

    List<RoleTemplatePermission> findByRoleTemplateId(Long roleTemplateId);
}
