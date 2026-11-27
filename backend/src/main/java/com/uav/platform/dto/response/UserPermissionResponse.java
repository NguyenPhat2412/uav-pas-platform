package com.uav.platform.dto.response;

import com.uav.platform.enums.PermissionCode;

public record UserPermissionResponse(PermissionCode code, boolean granted) {}
