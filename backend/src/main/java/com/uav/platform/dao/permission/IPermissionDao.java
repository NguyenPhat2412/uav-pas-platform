package com.uav.platform.dao.permission;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.permission.Permission;
import com.uav.platform.enums.permission.PermissionCode;

import java.util.Optional;

public interface IPermissionDao extends IGenericDao<Long, Permission> {
    Optional<Permission> findByCodeForUpdate(PermissionCode code);

    Optional<Permission> findByCode(PermissionCode code);
}
