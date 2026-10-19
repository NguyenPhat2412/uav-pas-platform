package com.uav.platform.modules.user.dto.request;

import com.uav.platform.modules.user.enums.UserRole;

import jakarta.validation.constraints.NotNull;

public record RoleUpdateRequest(@NotNull UserRole role) {}
