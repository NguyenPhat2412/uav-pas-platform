package com.uav.platform.dao.permission;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.permission.UserPermission;

import java.util.List;
import java.util.Optional;

public interface IUserPermissionDao extends IGenericDao<Long, UserPermission> {
    Optional<UserPermission> findByUserIdAndPermissionCode(
            Long userId, com.uav.platform.enums.permission.PermissionCode code);

    List<UserPermission> findByUserId(Long userId);

    void deleteByUserIdAndPermissionCode(
            Long userId, com.uav.platform.enums.permission.PermissionCode code);

    void deleteByUserId(Long userId);
}
