package com.uav.platform.dto.request.user.profile;

import jakarta.validation.constraints.NotNull;

public record AvatarUpdateRequest(@NotNull Long mediaId) {}
