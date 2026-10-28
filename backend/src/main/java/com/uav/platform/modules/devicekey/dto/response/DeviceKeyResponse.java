package com.uav.platform.modules.devicekey.dto.response;

import java.time.LocalDateTime;
import java.util.List;

/** Never carries the key or its hash; keyPrefix is a non-secret fragment for recognition. */
public record DeviceKeyResponse(
        Long id,
        String name,
        Long uavId,
        String uavSerialNumber,
        String keyPrefix,
        List<String> scopes,
        String status,
        String createdBy,
        LocalDateTime createdAt,
        LocalDateTime lastUsedAt,
        LocalDateTime expiresAt,
        LocalDateTime revokedAt) {}
