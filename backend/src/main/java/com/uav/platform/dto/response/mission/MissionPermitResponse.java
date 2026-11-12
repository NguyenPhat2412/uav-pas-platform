package com.uav.platform.dto.response.mission;

import com.uav.platform.enums.mission.FlightPermitStatus;

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
