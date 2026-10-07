package com.uav.platform.modules.user.config.response;

import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.common.PermissionCode;
import com.uav.platform.modules.user.common.UserRole;

import java.util.Set;

public record RoleTemplateResponse(UserRole role, String name, Set<PermissionCode> permissions) { }
