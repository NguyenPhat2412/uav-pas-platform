package com.uav.platform.modules.permission.dto.response;

import com.uav.platform.modules.permission.enums.PermissionCode;

public record PermissionResponse(PermissionCode code, String description) {}
