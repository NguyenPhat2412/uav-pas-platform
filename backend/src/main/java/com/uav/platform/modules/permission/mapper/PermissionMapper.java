package com.uav.platform.modules.permission.mapper;

import com.uav.platform.modules.permission.dto.response.PermissionResponse;
import com.uav.platform.modules.permission.dto.response.UserPermissionResponse;
import com.uav.platform.modules.permission.entity.Permission;
import com.uav.platform.modules.permission.entity.UserPermission;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface PermissionMapper {

    PermissionResponse toResponse(Permission permission);

    @Mapping(target = "code", source = "permission.code")
    UserPermissionResponse toResponse(UserPermission permission);
}
