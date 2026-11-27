package com.uav.platform.dto.response;

import com.uav.platform.enums.UavStatus;

import java.time.LocalDateTime;

public record ProviderUavResponse(
        Long id,
        String model,
        String serialNumber,
        String manufacturer,
        UavStatus status,
        LocalDateTime createdAt) {}
