package com.uav.platform.dto.request;

import com.uav.platform.enums.UserRole;

import jakarta.validation.constraints.NotNull;

public record RoleUpdateRequest(@NotNull UserRole role) {}
