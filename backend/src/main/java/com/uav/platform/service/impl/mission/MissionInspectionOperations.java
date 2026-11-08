package com.uav.platform.service.impl.mission;

import com.uav.platform.dto.response.mission.FlightPlanResponse;
import com.uav.platform.dto.response.mission.MissionInspectionReportResponse;
import com.uav.platform.dto.response.mission.MissionInspectionReportResponse.DeliverableGeoPin;
import com.uav.platform.dto.response.mission.MissionMediaResponse;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.mission.MissionPreflightLog;
import com.uav.platform.entity.mission.MissionReview;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.service.impl.uav.TelemetryReplayOperations;
import com.uav.platform.service.impl.uav.UavHealthOperations;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Aggregates mission inspection certificate data, flight geometry summary, and geotagged deliverable pins.
 */
public final class MissionInspectionOperations {

    private MissionInspectionOperations() {}

    public static MissionInspectionReportResponse buildReport(
            Mission mission,
            List<MissionMediaResponse> mediaItems,
            MissionPreflightLog preflight,
            MissionReview review) {
        FlightPlanResponse plan = FlightPlanOperations.read(mission.getFlightPlan());
        double baseLat =
                mission.getLatitude() != null
                        ? mission.getLatitude().doubleValue()
                        : (plan != null && plan.centerLatitude() != null
                                ? plan.centerLatitude()
                                : 21.0285);
        double baseLng =
                mission.getLongitude() != null
                        ? mission.getLongitude().doubleValue()
                        : (plan != null && plan.centerLongitude() != null
                                ? plan.centerLongitude()
                                : 105.8542);
        double altitude =
                plan != null && plan.altitudeAglMeters() != null
                        ? plan.altitudeAglMeters().doubleValue()
                        : 60.0;

        List<double[]> waypoints = extractWaypoints(plan, baseLat, baseLng);
        double totalDistance = 0.0;
        for (int i = 1; i < waypoints.size(); i++) {
            totalDistance +=
                    TelemetryReplayOperations.haversineMeters(
                            waypoints.get(i - 1)[0],
                            waypoints.get(i - 1)[1],
                            waypoints.get(i)[0],
                            waypoints.get(i)[1]);
        }
        totalDistance = Math.round(totalDistance * 10.0) / 10.0;

        List<DeliverableGeoPin> pins = new ArrayList<>();
        List<MissionMediaResponse> safeMedia = mediaItems == null ? List.of() : mediaItems;
        for (int i = 0; i < safeMedia.size(); i++) {
            MissionMediaResponse item = safeMedia.get(i);
            double[] wp = waypoints.get(i % waypoints.size());
            String fileName =
                    item.media() != null && item.media().originalName() != null
                            ? item.media().originalName()
                            : "deliverable-" + (i + 1) + ".jpg";
            String mediaType =
                    item.media() != null && item.media().type() != null
                            ? item.media().type().name()
                            : "IMAGE";
            Long assetId = item.media() != null ? item.media().id() : item.id();
            String fileUrl =
                    assetId != null
                            ? "/api/v1/media/" + assetId + "/download-url"
                            : "/images/uav-blueprint/uav-350-rtk-isometric.jpg";
            String phase = (i % 2 == 0) ? "BEFORE" : "AFTER";

            pins.add(
                    new DeliverableGeoPin(
                            assetId != null ? assetId : (long) (i + 1),
                            fileName,
                            mediaType,
                            fileUrl,
                            Math.round(wp[0] * 1_000_000.0) / 1_000_000.0,
                            Math.round(wp[1] * 1_000_000.0) / 1_000_000.0,
                            altitude,
                            (i % waypoints.size()) + 1,
                            phase,
                            item.createdAt() != null ? item.createdAt() : LocalDateTime.now()));
        }

        // If no uploaded media items exist yet, provide waypoint inspection checkpoints from the
        // flight plan
        if (pins.isEmpty()) {
            for (int i = 0; i < Math.min(4, waypoints.size()); i++) {
                double[] wp = waypoints.get(i);
                String phase = (i % 2 == 0) ? "BEFORE" : "AFTER";
                String img =
                        (i % 2 == 0)
                                ? "/images/uav-blueprint/uav-350-rtk-isometric.jpg"
                                : "/images/uav-blueprint/uav-350-rtk-turnaround.jpg";
                pins.add(
                        new DeliverableGeoPin(
                                (long) (i + 1),
                                "WP-" + (i + 1) + "-RTK-Survey.jpg",
                                "IMAGE",
                                img,
                                Math.round(wp[0] * 1_000_000.0) / 1_000_000.0,
                                Math.round(wp[1] * 1_000_000.0) / 1_000_000.0,
                                altitude,
                                i + 1,
                                phase,
                                mission.getCreatedAt() != null
                                        ? mission.getCreatedAt()
                                        : LocalDateTime.now()));
            }
        }

        Uav uav = mission.getUav();
        String uavSerial = uav != null ? uav.getSerialNumber() : "UAV-350-RTK";
        String uavModel = uav != null ? uav.getModel() : "Enterprise RTK Quadcopter";
        String airframeClass = UavHealthOperations.classifyAirframe(uavModel, uavSerial);

        boolean preflightPassed =
                preflight != null
                        && preflight.isClearedForTakeoff()
                        && preflight.isAirframeAndPropellersSafe()
                        && preflight.isBatteryHealthy()
                        && preflight.isGnssRtkLocked()
                        && preflight.isWeatherWithinLimits()
                        && preflight.isAirspaceAndPermitCleared();

        int year =
                mission.getStartTime() != null
                        ? mission.getStartTime().getYear()
                        : LocalDateTime.now().getYear();
        String certCode =
                String.format(
                        "CERT-UAV-%d-%05d", year, mission.getId() != null ? mission.getId() : 1L);

        return new MissionInspectionReportResponse(
                mission.getId(),
                mission.getCode(),
                mission.getTitle(),
                mission.getMissionType() != null
                        ? mission.getMissionType().name()
                        : "AREA_INSPECTION",
                mission.getStatus() != null ? mission.getStatus().name() : "UNKNOWN",
                mission.getPriority() != null ? mission.getPriority().name() : "NORMAL",
                mission.getCustomer() != null ? mission.getCustomer().getFullName() : null,
                mission.getLocationName(),
                baseLat,
                baseLng,
                mission.getStartTime(),
                mission.getExpectedEndTime(),
                mission.getStartTime(),
                mission.getCompletedAt(),
                mission.getStation() != null ? mission.getStation().getName() : null,
                mission.getOperator() != null ? mission.getOperator().getFullName() : null,
                uavSerial,
                uavModel,
                airframeClass,
                mission.getPermitStatus() != null
                        ? mission.getPermitStatus().name()
                        : "NOT_REQUIRED",
                mission.getPermitNumber(),
                preflightPassed,
                totalDistance,
                altitude,
                waypoints.size(),
                safeMedia.size(),
                review != null ? review.getOverallRating() : null,
                review != null ? review.getComment() : null,
                certCode,
                LocalDateTime.now(),
                pins);
    }

    private static List<double[]> extractWaypoints(
            FlightPlanResponse plan, double baseLat, double baseLng) {
        List<double[]> waypoints = new ArrayList<>();
        if (plan != null && plan.vertices() != null && !plan.vertices().isEmpty()) {
            for (List<Double> v : plan.vertices()) {
                if (v != null && v.size() >= 2 && v.get(0) != null && v.get(1) != null) {
                    waypoints.add(new double[] {v.get(0), v.get(1)});
                }
            }
        }
        if (waypoints.size() < 2) {
            waypoints.add(new double[] {baseLat + 0.0014, baseLng - 0.0014});
            waypoints.add(new double[] {baseLat + 0.0014, baseLng + 0.0014});
            waypoints.add(new double[] {baseLat - 0.0014, baseLng + 0.0014});
            waypoints.add(new double[] {baseLat - 0.0014, baseLng - 0.0014});
        }
        return waypoints;
    }
}
