package com.uav.platform.dto.request.marketplace.provider;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProviderOrderAssignRequest(
        Long pilotId,
        Long pilotUserId,
        @NotNull(message = "Vui lòng chọn tàu bay UAV") Long uavId,
        @Size(max = 500) String note) {}
