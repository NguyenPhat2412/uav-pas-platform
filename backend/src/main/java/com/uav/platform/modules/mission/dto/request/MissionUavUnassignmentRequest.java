package com.uav.platform.modules.mission.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record MissionUavUnassignmentRequest(
        @NotNull @Positive Long expectedCurrentUavId, @NotBlank @Size(max = 500) String reason) {}
