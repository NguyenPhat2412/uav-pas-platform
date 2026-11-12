package com.uav.platform.dto.request.user;

import com.uav.platform.enums.user.UserRole;

import jakarta.validation.constraints.NotNull;

public record RoleUpdateRequest(@NotNull UserRole role) {}
