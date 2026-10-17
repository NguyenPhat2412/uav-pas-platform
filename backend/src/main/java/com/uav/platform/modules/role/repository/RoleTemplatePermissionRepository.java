package com.uav.platform.modules.role.repository;

import com.uav.platform.modules.role.entity.RoleTemplatePermission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface RoleTemplatePermissionRepository
        extends JpaRepository<RoleTemplatePermission, Long>,
                JpaSpecificationExecutor<RoleTemplatePermission> {
    Optional<RoleTemplatePermission> findByRoleTemplateIdAndPermissionCode(
            Long roleTemplateId, com.uav.platform.modules.permission.enums.PermissionCode code);

    List<RoleTemplatePermission> findByRoleTemplateId(Long roleTemplateId);
}
