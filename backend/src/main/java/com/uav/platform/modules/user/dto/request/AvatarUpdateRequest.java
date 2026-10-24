package com.uav.platform.modules.user.dto.request;

import jakarta.validation.constraints.NotNull;

public record AvatarUpdateRequest(@NotNull Long mediaId) {}
