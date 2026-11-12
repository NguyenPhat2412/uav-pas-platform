package com.uav.platform.mapper.role;

import com.uav.platform.dto.response.role.RoleTemplateResponse;
import com.uav.platform.entity.role.RoleTemplate;
import com.uav.platform.enums.permission.PermissionCode;

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
