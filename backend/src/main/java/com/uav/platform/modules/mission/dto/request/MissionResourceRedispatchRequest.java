package com.uav.platform.modules.mission.dto.request;

import jakarta.validation.constraints.*;

/** A null replacement explicitly removes the current assignment. */
public record MissionResourceRedispatchRequest(
        @NotNull @PositiveOrZero Long expectedVersion,
        @Positive Long replacementId,
        @NotBlank @Size(max = 500) String reason) {}
