package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.Permission;
import com.uav.platform.enums.PermissionCode;

import java.util.Optional;

public interface IPermissionDao extends IGenericDao<Long, Permission> {
    Optional<Permission> findByCodeForUpdate(PermissionCode code);

    Optional<Permission> findByCode(PermissionCode code);
}
