package com.uav.platform.dto.request.mission;

import com.uav.platform.enums.mission.*;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MissionCompletionRequest(
        @NotBlank @Size(max = 500) String completionNote,
        @NotBlank @Size(max = 500) String equipmentCondition) {}
