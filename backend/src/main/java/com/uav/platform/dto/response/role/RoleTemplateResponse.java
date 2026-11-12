package com.uav.platform.dto.response.role;

import com.uav.platform.enums.permission.PermissionCode;
import com.uav.platform.enums.user.UserRole;

import java.util.Set;

public record RoleTemplateResponse(UserRole role, String name, Set<PermissionCode> permissions) {}
