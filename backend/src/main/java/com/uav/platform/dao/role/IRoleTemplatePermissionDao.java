package com.uav.platform.dao.role;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.role.RoleTemplatePermission;

import java.util.List;
import java.util.Optional;

public interface IRoleTemplatePermissionDao extends IGenericDao<Long, RoleTemplatePermission> {
    Optional<RoleTemplatePermission> findByRoleTemplateIdAndPermissionCode(
            Long roleTemplateId, com.uav.platform.enums.permission.PermissionCode code);

    List<RoleTemplatePermission> findByRoleTemplateId(Long roleTemplateId);
}
