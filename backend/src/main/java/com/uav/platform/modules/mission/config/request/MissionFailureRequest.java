package com.uav.platform.modules.mission.config.request;


import com.uav.platform.modules.mission.common.*;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MissionFailureRequest(@NotBlank @Size(max = 500) String failureReason,
                                    @Size(max = 2000) String notes) {}
