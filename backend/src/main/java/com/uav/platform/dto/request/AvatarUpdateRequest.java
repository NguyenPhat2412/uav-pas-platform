package com.uav.platform.dto.request;

import jakarta.validation.constraints.NotNull;

public record AvatarUpdateRequest(@NotNull Long mediaId) {}
