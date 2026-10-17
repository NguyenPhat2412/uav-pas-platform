package com.uav.platform.modules.role.mapper;

import com.uav.platform.modules.permission.enums.PermissionCode;
import com.uav.platform.modules.role.dto.response.RoleTemplateResponse;
import com.uav.platform.modules.role.entity.RoleTemplate;

import java.util.Set;

public final class RoleTemplateMapper {
    private RoleTemplateMapper() {}

    public static RoleTemplateResponse toResponse(
            RoleTemplate template, Set<PermissionCode> permissions) {
        return new RoleTemplateResponse(template.getRole(), template.getName(), permissions);
    }
}
