package com.uav.platform.dto.response.permission;

import com.uav.platform.enums.permission.PermissionCode;

public record PermissionResponse(PermissionCode code, String description) {}
