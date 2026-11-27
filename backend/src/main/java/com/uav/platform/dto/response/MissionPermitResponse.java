package com.uav.platform.dto.response;

import com.uav.platform.enums.FlightPermitStatus;

import java.time.LocalDateTime;

public record MissionPermitResponse(
        FlightPermitStatus status,
        String permitNumber,
        String permitAuthority,
        LocalDateTime validFrom,
        LocalDateTime validUntil,
        Integer maxAltitudeMeters,
        Long permitMediaId,
        String verifiedBy,
        LocalDateTime verifiedAt,
        String note) {}
