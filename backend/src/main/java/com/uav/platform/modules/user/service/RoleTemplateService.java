package com.uav.platform.modules.user.service;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.config.response.RoleTemplateResponse;
import com.uav.platform.modules.user.common.PermissionCode;
import com.uav.platform.modules.user.common.UserRole;

import java.util.List;

public interface RoleTemplateService {
    List<RoleTemplateResponse> list();
    void setPermission(UserRole role, PermissionCode code, boolean granted, String actor);
}
