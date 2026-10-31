package com.uav.platform.dto.request.user;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BulkLockRequest(@NotEmpty @Size(max = 100) List<@NotNull Long> ids, boolean locked) {}
