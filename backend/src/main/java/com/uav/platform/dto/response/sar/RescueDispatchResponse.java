package com.uav.platform.dto.response.sar;

public record RescueDispatchResponse(
        String status,
        boolean externalDeliveryConfirmed,
        String eventType,
        Long missionId,
        String timestamp,
        String message) {}
