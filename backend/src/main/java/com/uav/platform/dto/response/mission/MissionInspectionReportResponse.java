package com.uav.platform.dto.response.mission;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Aggregated mission inspection report, verification certificate, and geotagged deliverable pins.
 */
public record MissionInspectionReportResponse(
        Long missionId,
        String missionCode,
        String title,
        String missionType,
        String status,
        String priority,
        String customerName,
        String locationName,
        Double latitude,
        Double longitude,
        LocalDateTime startTime,
        LocalDateTime expectedEndTime,
        LocalDateTime actualStartTime,
        LocalDateTime actualEndTime,
        String stationName,
        String operatorName,
        String uavSerialNumber,
        String uavModel,
        String airframeClass,
        String permitStatus,
        String permitReference,
        boolean preflightPassed,
        double totalDistanceMeters,
        double maxAltitudeMeters,
        int waypointCount,
        int mediaCount,
        Integer customerRating,
        String customerReviewComment,
        String certificateCode,
        LocalDateTime generatedAt,
        List<DeliverableGeoPin> deliverablePins) {

    public record DeliverableGeoPin(
            Long mediaId,
            String fileName,
            String mediaType,
            String fileUrl,
            double latitude,
            double longitude,
            double altitudeMeters,
            int waypointIndex,
            String phaseLabel,
            LocalDateTime uploadedAt) {}
}
