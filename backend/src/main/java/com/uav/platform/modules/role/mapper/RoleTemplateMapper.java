package com.uav.platform.modules.role.mapper;

import com.uav.platform.modules.permission.enums.PermissionCode;
import com.uav.platform.modules.role.dto.response.RoleTemplateResponse;
import com.uav.platform.modules.role.entity.RoleTemplate;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;

import java.util.Set;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface RoleTemplateMapper {

    @Mapping(target = "role", source = "template.role")
    @Mapping(target = "name", source = "template.name")
    @Mapping(target = "permissions", source = "permissions")
    RoleTemplateResponse toResponse(RoleTemplate template, Set<PermissionCode> permissions);
}
