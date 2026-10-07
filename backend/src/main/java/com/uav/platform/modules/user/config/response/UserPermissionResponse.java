package com.uav.platform.modules.user.config.response;

import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.common.PermissionCode;

public record UserPermissionResponse(PermissionCode code, boolean granted) { }
