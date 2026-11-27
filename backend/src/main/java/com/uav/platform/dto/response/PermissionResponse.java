package com.uav.platform.dto.response;

import com.uav.platform.enums.PermissionCode;

public record PermissionResponse(PermissionCode code, String description) {}
