package com.uav.platform.modules.mission.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Commander/admin closure of a mission the assigned operator cannot close; the reason is audited. */
public record MissionForceFailRequest(
        @NotBlank @Size(max = 500) String reason, @Size(max = 2000) String notes) {}
