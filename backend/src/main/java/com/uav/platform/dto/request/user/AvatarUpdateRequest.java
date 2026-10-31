package com.uav.platform.dto.request.user;

import jakarta.validation.constraints.NotNull;

public record AvatarUpdateRequest(@NotNull Long mediaId) {}
