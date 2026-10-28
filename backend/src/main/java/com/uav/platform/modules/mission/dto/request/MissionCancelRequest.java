package com.uav.platform.modules.mission.dto.request;

import jakarta.validation.constraints.Size;

/** Optional body of POST /missions/{id}/cancel; the reason is shown in the mission timeline. */
public record MissionCancelRequest(@Size(max = 500) String reason) {}
