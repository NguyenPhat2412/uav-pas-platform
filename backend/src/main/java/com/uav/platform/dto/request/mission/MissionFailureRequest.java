package com.uav.platform.dto.request.mission;

import com.uav.platform.enums.mission.*;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MissionFailureRequest(
        @NotBlank @Size(max = 500) String failureReason, @Size(max = 2000) String notes) {}
