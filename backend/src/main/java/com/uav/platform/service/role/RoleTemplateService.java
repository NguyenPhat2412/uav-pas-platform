package com.uav.platform.service.role;

import com.uav.platform.dto.response.role.RoleTemplateResponse;
import com.uav.platform.enums.permission.PermissionCode;
import com.uav.platform.enums.user.UserRole;

import java.util.List;

public interface RoleTemplateService {
    List<RoleTemplateResponse> list();

    void setPermission(UserRole role, PermissionCode code, boolean granted, String actor);
}
