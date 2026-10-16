package com.uav.platform.modules.mission.config.request;


import com.uav.platform.modules.mission.common.*;

import jakarta.validation.constraints.Size;

public record MissionCompletionRequest(
        @Size(max = 500) String completionNote,
        @Size(max = 500) String equipmentCondition) {}
