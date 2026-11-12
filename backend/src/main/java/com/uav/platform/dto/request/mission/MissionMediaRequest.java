package com.uav.platform.dto.request.mission;

import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.mission.MediaRole;

import jakarta.validation.constraints.NotNull;

public record MissionMediaRequest(@NotNull Long mediaId, @NotNull MediaRole mediaRole) {}
