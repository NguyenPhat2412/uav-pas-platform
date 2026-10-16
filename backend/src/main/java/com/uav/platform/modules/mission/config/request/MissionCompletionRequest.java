package com.uav.platform.modules.mission.config.request;


import com.uav.platform.modules.mission.common.*;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

public record MissionCompletionRequest(
        @NotBlank @Size(max = 500) String completionNote,
        @NotBlank @Size(max = 500) String equipmentCondition) {}
