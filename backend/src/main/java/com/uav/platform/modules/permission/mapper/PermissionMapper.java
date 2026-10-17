package com.uav.platform.modules.permission.mapper;

import com.uav.platform.modules.permission.dto.response.PermissionResponse;
import com.uav.platform.modules.permission.dto.response.UserPermissionResponse;
import com.uav.platform.modules.permission.entity.Permission;
import com.uav.platform.modules.permission.entity.UserPermission;

public final class PermissionMapper {
    private PermissionMapper() {}

    public static PermissionResponse toResponse(Permission permission) {
        return new PermissionResponse(permission.getCode(), permission.getDescription());
    }

    public static UserPermissionResponse toResponse(UserPermission permission) {
        return new UserPermissionResponse(
                permission.getPermission().getCode(), permission.isGranted());
    }
}
