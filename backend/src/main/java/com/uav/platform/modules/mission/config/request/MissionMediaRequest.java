package com.uav.platform.modules.mission.config.request;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.common.MediaRole;
import jakarta.validation.constraints.NotNull;

public record MissionMediaRequest(@NotNull Long mediaId, @NotNull MediaRole mediaRole) {}
