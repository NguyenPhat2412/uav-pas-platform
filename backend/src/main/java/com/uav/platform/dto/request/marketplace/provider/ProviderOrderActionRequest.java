package com.uav.platform.dto.request.marketplace.provider;

import jakarta.validation.constraints.Size;

public record ProviderOrderActionRequest(
        boolean accept, Long uavId, @Size(max = 1000) String responseNote) {}
