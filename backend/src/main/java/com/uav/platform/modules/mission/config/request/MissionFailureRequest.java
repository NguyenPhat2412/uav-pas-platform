package com.uav.platform.modules.mission.config.request;


import com.uav.platform.modules.mission.common.*;

import jakarta.validation.constraints.NotBlank;

public record MissionFailureRequest(@NotBlank String failureReason, String notes) {}
