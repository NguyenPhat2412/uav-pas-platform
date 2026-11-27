package com.uav.platform.service;

import com.uav.platform.dto.response.RoleTemplateResponse;
import com.uav.platform.enums.PermissionCode;
import com.uav.platform.enums.UserRole;

import java.util.List;

public interface RoleTemplateService {
    List<RoleTemplateResponse> list();

    void setPermission(UserRole role, PermissionCode code, boolean granted, String actor);
}
