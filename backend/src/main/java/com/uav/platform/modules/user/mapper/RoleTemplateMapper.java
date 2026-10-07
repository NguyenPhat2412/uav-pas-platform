package com.uav.platform.modules.user.mapper;

import com.uav.platform.modules.user.config.response.RoleTemplateResponse;
import com.uav.platform.modules.user.entity.RoleTemplate;
import com.uav.platform.modules.user.common.PermissionCode;
import java.util.Set;

public final class RoleTemplateMapper {
    private RoleTemplateMapper() {}
    public static RoleTemplateResponse toResponse(RoleTemplate template, Set<PermissionCode> permissions) {
        return new RoleTemplateResponse(template.getRole(), template.getName(), permissions);
    }
}
