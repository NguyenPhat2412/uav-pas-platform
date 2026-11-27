package com.uav.platform.dto.request;

import com.uav.platform.enums.*;
import com.uav.platform.enums.MediaRole;

import jakarta.validation.constraints.NotNull;

public record MissionMediaRequest(@NotNull Long mediaId, @NotNull MediaRole mediaRole) {}
