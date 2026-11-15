package com.uav.platform.dto.response.marketplace.provider;

import com.uav.platform.enums.uav.UavStatus;

import java.time.LocalDateTime;

public record ProviderUavResponse(
        Long id,
        String model,
        String serialNumber,
        String manufacturer,
        UavStatus status,
        LocalDateTime createdAt) {}
