package com.uav.platform.modules.role.dto.response;

import com.uav.platform.modules.permission.enums.PermissionCode;
import com.uav.platform.modules.user.enums.UserRole;

import java.util.Set;

public record RoleTemplateResponse(UserRole role, String name, Set<PermissionCode> permissions) {}
