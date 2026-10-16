package com.uav.platform.modules.mission.config.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Version of the assignment actually reviewed by the operator. */
public record MissionAcceptanceRequest(@NotNull @Min(0) Long expectedVersion) {}
