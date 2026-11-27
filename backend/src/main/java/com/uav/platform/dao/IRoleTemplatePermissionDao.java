package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.RoleTemplatePermission;

import java.util.List;
import java.util.Optional;

public interface IRoleTemplatePermissionDao extends IGenericDao<Long, RoleTemplatePermission> {
    Optional<RoleTemplatePermission> findByRoleTemplateIdAndPermissionCode(
            Long roleTemplateId, com.uav.platform.enums.PermissionCode code);

    List<RoleTemplatePermission> findByRoleTemplateId(Long roleTemplateId);
}
