package com.uav.platform.mapper.permission;

import com.uav.platform.dto.response.permission.PermissionResponse;
import com.uav.platform.dto.response.permission.UserPermissionResponse;
import com.uav.platform.entity.permission.Permission;
import com.uav.platform.entity.permission.UserPermission;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface PermissionMapper {

    PermissionResponse toResponse(Permission permission);

    @Mapping(target = "code", source = "permission.code")
    UserPermissionResponse toResponse(UserPermission permission);
}
