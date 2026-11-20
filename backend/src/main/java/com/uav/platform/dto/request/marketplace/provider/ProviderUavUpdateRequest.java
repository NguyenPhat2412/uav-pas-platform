package com.uav.platform.dto.request.marketplace.provider;

import com.uav.platform.enums.uav.UavStatus;

import jakarta.validation.constraints.Size;

public record ProviderUavUpdateRequest(
        @Size(max = 100) String model,
        @Size(max = 100) String serialNumber,
        @Size(max = 100) String manufacturer,
        UavStatus status) {}
