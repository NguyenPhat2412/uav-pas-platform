package com.uav.platform.modules.permission.dto.response;

import com.uav.platform.modules.permission.enums.PermissionCode;

public record UserPermissionResponse(PermissionCode code, boolean granted) {}
