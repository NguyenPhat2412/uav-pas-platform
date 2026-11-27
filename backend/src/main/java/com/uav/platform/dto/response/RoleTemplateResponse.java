package com.uav.platform.dto.response;

import com.uav.platform.enums.PermissionCode;
import com.uav.platform.enums.UserRole;

import java.util.Set;

public record RoleTemplateResponse(UserRole role, String name, Set<PermissionCode> permissions) {}
