package com.uav.platform.modules.user.config.request;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.common.UserRole;
import jakarta.validation.constraints.NotNull;

public record RoleUpdateRequest(@NotNull UserRole role) { }
