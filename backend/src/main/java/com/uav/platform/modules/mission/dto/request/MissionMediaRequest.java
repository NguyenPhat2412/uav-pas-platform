package com.uav.platform.modules.mission.dto.request;

import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.enums.MediaRole;

import jakarta.validation.constraints.NotNull;

public record MissionMediaRequest(@NotNull Long mediaId, @NotNull MediaRole mediaRole) {}
