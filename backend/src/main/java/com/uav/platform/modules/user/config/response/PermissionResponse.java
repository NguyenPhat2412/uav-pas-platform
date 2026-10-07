package com.uav.platform.modules.user.config.response;

import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.common.PermissionCode;

public record PermissionResponse(PermissionCode code, String description) { }
