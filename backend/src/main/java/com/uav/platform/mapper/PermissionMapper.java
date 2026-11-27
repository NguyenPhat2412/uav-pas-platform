package com.uav.platform.mapper;

import com.uav.platform.dto.response.PermissionResponse;
import com.uav.platform.dto.response.UserPermissionResponse;
import com.uav.platform.entity.Permission;
import com.uav.platform.entity.UserPermission;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface PermissionMapper {

    PermissionResponse toResponse(Permission permission);

    @Mapping(target = "code", source = "permission.code")
    UserPermissionResponse toResponse(UserPermission permission);
}
