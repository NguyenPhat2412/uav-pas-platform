package com.uav.platform.mapper;

import com.uav.platform.dto.response.RoleTemplateResponse;
import com.uav.platform.entity.RoleTemplate;
import com.uav.platform.enums.PermissionCode;

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
