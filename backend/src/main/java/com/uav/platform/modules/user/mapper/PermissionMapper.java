package com.uav.platform.modules.user.mapper;

import com.uav.platform.modules.user.config.response.PermissionResponse;
import com.uav.platform.modules.user.config.response.UserPermissionResponse;
import com.uav.platform.modules.user.entity.Permission;
import com.uav.platform.modules.user.entity.UserPermission;

public final class PermissionMapper {
    private PermissionMapper() {}
    public static PermissionResponse toResponse(Permission permission) {
        return new PermissionResponse(permission.getCode(), permission.getDescription());
    }
    public static UserPermissionResponse toResponse(UserPermission permission) {
        return new UserPermissionResponse(permission.getPermission().getCode(), permission.isGranted());
    }
}
