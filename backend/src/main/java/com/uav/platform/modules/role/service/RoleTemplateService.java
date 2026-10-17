package com.uav.platform.modules.role.service;

import com.uav.platform.modules.permission.enums.PermissionCode;
import com.uav.platform.modules.role.dto.response.RoleTemplateResponse;
import com.uav.platform.modules.user.enums.UserRole;

import java.util.List;

public interface RoleTemplateService {
    List<RoleTemplateResponse> list();

    void setPermission(UserRole role, PermissionCode code, boolean granted, String actor);
}
