package com.uav.platform.modules.mission.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record MissionUavReplacementRequest(
        @NotNull @Positive Long expectedCurrentUavId,
        @NotNull @Positive Long replacementUavId,
        @NotBlank @Size(max = 500) String reason) {}
