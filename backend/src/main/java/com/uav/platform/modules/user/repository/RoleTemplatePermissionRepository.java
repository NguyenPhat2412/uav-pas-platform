package com.uav.platform.modules.user.repository;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.entity.RoleTemplatePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.List;

public interface RoleTemplatePermissionRepository extends JpaRepository<RoleTemplatePermission, Long>, JpaSpecificationExecutor<RoleTemplatePermission> {
    Optional<RoleTemplatePermission> findByRoleTemplateIdAndPermissionCode(Long roleTemplateId, com.uav.platform.modules.user.common.PermissionCode code);
    List<RoleTemplatePermission> findByRoleTemplateId(Long roleTemplateId);
}
