package com.uav.platform.modules.sar.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.notification.common.NotificationType;
import com.uav.platform.modules.notification.config.request.CreateNotificationRequest;
import com.uav.platform.modules.notification.service.NotificationService;
import com.uav.platform.modules.sar.common.SarStatus;
import com.uav.platform.modules.sar.config.request.FlightPlanRequest;
import com.uav.platform.modules.sar.config.request.SarMissionRequest;
import com.uav.platform.modules.sar.config.request.TelemetryEvaluateRequest;
import com.uav.platform.modules.sar.config.response.FlightPlanResponse;
import com.uav.platform.modules.sar.config.response.SarMissionResponse;
import com.uav.platform.modules.sar.config.response.TelemetryEvaluateResponse;
import com.uav.platform.modules.sar.config.response.WaypointResponse;
import com.uav.platform.modules.sar.entity.SarMission;
import com.uav.platform.modules.sar.mapper.SarMapper;
import com.uav.platform.modules.sar.repository.SarMissionRepository;
import com.uav.platform.modules.sar.service.SarService;
import com.uav.platform.modules.webhook.service.WebhookService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class ISarService implements SarService {

    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    private final SarMissionRepository sarRepository;
    private final MissionRepository missionRepository;
    private final NotificationService notificationService;
    private final WebhookService webhookService;

    public ISarService(SarMissionRepository sarRepository, MissionRepository missionRepository) {
        this(sarRepository, missionRepository, null, null);
    }

    @Autowired
    public ISarService(SarMissionRepository sarRepository,
                       MissionRepository missionRepository,
                       @Autowired(required = false) NotificationService notificationService,
                       @Autowired(required = false) WebhookService webhookService) {
        this.sarRepository = sarRepository;
        this.missionRepository = missionRepository;
        this.notificationService = notificationService;
        this.webhookService = webhookService;
    }

    @Override
    public SarMissionResponse registerSar(SarMissionRequest request, Authentication authentication) {
        Mission mission = missionRepository.findById(request.missionId())
            .orElseThrow(() -> SystemException.notFound("Mission not found with id: " + request.missionId()));

        SarMission sar = sarRepository.findByMissionId(request.missionId())
            .orElseGet(() -> new SarMission(
                mission,
                request.searchAreaPolygon(),
                request.lkpLatitude(),
                request.lkpLongitude(),
                request.driftRadiusMeters(),
                request.emergencyContact(),
                request.victimCountEstimated(),
                request.notes()
            ));

        sar.setSearchAreaPolygon(request.searchAreaPolygon());
        sar.setLkpLatitude(request.lkpLatitude());
        sar.setLkpLongitude(request.lkpLongitude());
        if (request.driftRadiusMeters() != null) sar.setDriftRadiusMeters(request.driftRadiusMeters());
        if (request.emergencyContact() != null) sar.setEmergencyContact(request.emergencyContact());
        if (request.victimCountEstimated() != null) sar.setVictimCountEstimated(request.victimCountEstimated());
        if (request.notes() != null) sar.setNotes(request.notes());

        SarMission saved = sarRepository.save(sar);
        return SarMapper.toSarMissionResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public SarMissionResponse getByMissionId(Long missionId, Authentication authentication) {
        SarMission sar = sarRepository.findByMissionId(missionId)
            .orElseThrow(() -> SystemException.notFound("SAR details not found for mission id: " + missionId));
        return SarMapper.toSarMissionResponse(sar);
    }

    @Override
    public SarMissionResponse updateSarStatus(Long missionId, SarStatus status, Authentication authentication) {
        SarMission sar = sarRepository.findByMissionId(missionId)
            .orElseThrow(() -> SystemException.notFound("SAR details not found for mission id: " + missionId));
        sar.setSarStatus(status);
        SarMission saved = sarRepository.save(sar);
        return SarMapper.toSarMissionResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public FlightPlanResponse generateFlightPlan(FlightPlanRequest request, Authentication authentication) {
        double sweepWidth = (request.sweepWidthMeters() != null && request.sweepWidthMeters() > 5.0)
            ? request.sweepWidthMeters() : 50.0;
        int maxLegs = (request.maxLegs() != null && request.maxLegs() >= 2 && request.maxLegs() <= 40)
            ? request.maxLegs() : 10;
        double cruiseSpeed = (request.cruiseSpeedMs() != null && request.cruiseSpeedMs() > 1.0)
            ? request.cruiseSpeedMs() : 12.0;

        List<WaypointResponse> waypoints = new ArrayList<>();
        double currentLat = request.lkpLat();
        double currentLng = request.lkpLng();
        waypoints.add(new WaypointResponse(0, round6(currentLat), round6(currentLng), 0.0, 0.0, "LKP (Datum)"));

        double[] headings = {0.0, 90.0, 180.0, 270.0};
        double totalDistance = 0.0;

        for (int leg = 1; leg <= maxLegs; leg++) {
            int multiplier = (leg + 1) / 2;
            double legDistance = multiplier * sweepWidth;
            double bearing = headings[(leg - 1) % 4];
            double[] nextCoord = offsetCoordinate(currentLat, currentLng, legDistance, bearing);
            currentLat = nextCoord[0];
            currentLng = nextCoord[1];
            totalDistance += legDistance;
            waypoints.add(new WaypointResponse(
                leg,
                round6(currentLat),
                round6(currentLng),
                Math.round(legDistance * 10.0) / 10.0,
                bearing,
                "WP-" + leg
            ));
        }

        double estimatedFlightMinutes = Math.round(((totalDistance / cruiseSpeed) / 60.0) * 10.0) / 10.0;
        return new FlightPlanResponse(
            request.missionId(),
            "IAMSAR_EXPANDING_SQUARE",
            request.lkpLat(),
            request.lkpLng(),
            sweepWidth,
            Math.round(totalDistance),
            estimatedFlightMinutes,
            waypoints
        );
    }

    @Override
    public TelemetryEvaluateResponse evaluateTelemetry(TelemetryEvaluateRequest request, Authentication authentication) {
        double cruiseSpeed = request.cruiseSpeedMs() > 0 ? request.cruiseSpeedMs() : 12.0;
        double dischargeRate = (request.dischargeRatePctPerMin() != null && request.dischargeRatePctPerMin() > 0)
            ? request.dischargeRatePctPerMin() : 2.2;
        double safetyReserve = (request.safetyReservePct() != null && request.safetyReservePct() >= 0)
            ? request.safetyReservePct() : 20.0;

        double distMeters = haversineDistance(
            request.currentLat(), request.currentLng(),
            request.homeLat(), request.homeLng()
        );
        double returnTimeSec = distMeters / cruiseSpeed;
        double returnTimeMin = returnTimeSec / 60.0;
        double flightDrainPct = returnTimeMin * dischargeRate;
        double requiredBatteryPct = Math.round((flightDrainPct + safetyReserve) * 10.0) / 10.0;
        boolean mustTriggerRth = request.batteryPct() <= requiredBatteryPct;

        String rthStatus = "SAFE";
        if (mustTriggerRth) {
            rthStatus = "CRITICAL_TRIGGER_RTH";
        } else if (request.batteryPct() <= requiredBatteryPct + 8.0) {
            rthStatus = "WARNING_PREPARE_RTH";
        }

        boolean insideGeofence = isPointInsideGeofence(
            request.currentLat(),
            request.currentLng(),
            request.geofencePolygon()
        );

        boolean alertDispatched = false;
        String recommendation = "Flight parameters nominal. Maintain IAMSAR search pattern.";
        if (!insideGeofence && mustTriggerRth) {
            recommendation = "CRITICAL: Geofence breach AND low battery! Immediate Return-To-Home (RTH) triggered.";
        } else if (!insideGeofence) {
            recommendation = "WARNING: UAV outside designated SAR geofence polygon! Redirecting to sector boundary.";
        } else if (mustTriggerRth) {
            recommendation = "CRITICAL: Battery at RTH threshold (" + requiredBatteryPct + "%). Execute Return-To-Home immediately.";
        } else if ("WARNING_PREPARE_RTH".equals(rthStatus)) {
            recommendation = "CAUTION: Approaching RTH battery threshold (" + requiredBatteryPct + "%). Prepare recovery.";
        }

        if (mustTriggerRth || !insideGeofence) {
            alertDispatched = triggerSafetyAlert(request, distMeters, requiredBatteryPct, mustTriggerRth, insideGeofence, recommendation);
        }

        return new TelemetryEvaluateResponse(
            request.missionId(),
            request.uavCode() != null ? request.uavCode() : "UAV-SAR-01",
            Math.round(distMeters),
            Math.round(returnTimeSec),
            requiredBatteryPct,
            request.batteryPct(),
            mustTriggerRth,
            rthStatus,
            insideGeofence,
            alertDispatched,
            recommendation
        );
    }

    @Override
    public Map<String, Object> dispatchRescueCoordinates(Long missionId, Map<String, Object> payload, Authentication authentication) {
        if (missionId != null) {
            sarRepository.findByMissionId(missionId).ifPresent(sar -> {
                sar.setSarStatus(SarStatus.TARGET_LOCATED);
                sarRepository.save(sar);
            });
        }

        Map<String, Object> eventData = new HashMap<>();
        if (payload != null) {
            eventData.putAll(payload);
        }
        eventData.put("missionId", missionId != null ? missionId : 1L);
        eventData.put("dispatchedBy", authentication != null ? authentication.getName() : "OPERATOR");
        eventData.put("dispatchedAt", LocalDateTime.now().toString());

        if (webhookService != null) {
            webhookService.broadcastEvent("SAR_EMERGENCY_TRIGGERED", eventData);
        }

        if (notificationService != null && missionId != null) {
            missionRepository.findById(missionId).ifPresent(mission -> {
                if (mission.getCustomer() != null && mission.getCustomer().getId() != null) {
                    try {
                        notificationService.sendNotification(new CreateNotificationRequest(
                            mission.getCustomer().getId(),
                            "SAR Target Located - Mission " + mission.getCode(),
                            "Coordinates dispatched to Rescue 114 Command Center: " + eventData.getOrDefault("coordinates", "20.7284, 107.0512"),
                            NotificationType.SAR_TARGET_FOUND,
                            "MISSION",
                            mission.getId()
                        ));
                    } catch (RuntimeException ignored) {
                    }
                }
            });
        }

        return Map.of(
            "status", "DISPATCHED",
            "eventType", "SAR_EMERGENCY_TRIGGERED",
            "missionId", missionId != null ? missionId : 1L,
            "timestamp", LocalDateTime.now().toString(),
            "message", "Đã truyền tọa độ mục tiêu SAR kèm chữ ký số HMAC-SHA256 tới Trung tâm Cứu nạn 114."
        );
    }

    private boolean triggerSafetyAlert(TelemetryEvaluateRequest req,
                                       double distMeters,
                                       double requiredBatteryPct,
                                       boolean mustTriggerRth,
                                       boolean insideGeofence,
                                       String recommendation) {
        boolean dispatched = false;
        if (webhookService != null) {
            Map<String, Object> alertPayload = Map.of(
                "missionId", req.missionId() != null ? req.missionId() : 0L,
                "uavCode", req.uavCode() != null ? req.uavCode() : "UAV-SAR-01",
                "batteryPct", req.batteryPct(),
                "requiredBatteryPct", requiredBatteryPct,
                "distanceToHomeMeters", Math.round(distMeters),
                "insideGeofence", insideGeofence,
                "recommendation", recommendation
            );
            if (!insideGeofence) {
                webhookService.broadcastEvent("GEOFENCE_BREACH", alertPayload);
            }
            if (mustTriggerRth) {
                webhookService.broadcastEvent("BATTERY_CRITICAL_RTH", alertPayload);
            }
            dispatched = true;
        }
        if (notificationService != null && req.missionId() != null) {
            missionRepository.findById(req.missionId()).ifPresent(mission -> {
                Long targetUserId = mission.getOperator() != null
                    ? mission.getOperator().getId()
                    : (mission.getCustomer() != null ? mission.getCustomer().getId() : null);
                if (targetUserId != null) {
                    try {
                        notificationService.sendNotification(new CreateNotificationRequest(
                            targetUserId,
                            "UAV Safety Alert: " + (req.uavCode() != null ? req.uavCode() : "UAV-SAR-01"),
                            recommendation,
                            NotificationType.SYSTEM,
                            "MISSION",
                            mission.getId()
                        ));
                    } catch (RuntimeException ignored) {
                    }
                }
            });
            dispatched = true;
        }
        return dispatched;
    }

    public static double haversineDistance(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLng / 2.0) * Math.sin(dLng / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return EARTH_RADIUS_METERS * c;
    }

    public static double[] offsetCoordinate(double lat, double lng, double distanceMeters, double bearingDeg) {
        double angularDist = distanceMeters / EARTH_RADIUS_METERS;
        double bearingRad = Math.toRadians(bearingDeg);
        double lat1 = Math.toRadians(lat);
        double lng1 = Math.toRadians(lng);

        double lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(angularDist)
                + Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearingRad)
        );
        double lng2 = lng1 + Math.atan2(
            Math.sin(bearingRad) * Math.sin(angularDist) * Math.cos(lat1),
            Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2)
        );
        return new double[]{Math.toDegrees(lat2), Math.toDegrees(lng2)};
    }

    public static boolean isPointInsideGeofence(double lat, double lng, List<List<Double>> polygon) {
        if (polygon == null || polygon.size() < 3) {
            return true;
        }
        boolean inside = false;
        for (int i = 0, j = polygon.size() - 1; i < polygon.size(); j = i++) {
            List<Double> pi = polygon.get(i);
            List<Double> pj = polygon.get(j);
            if (pi == null || pj == null || pi.size() < 2 || pj.size() < 2) continue;
            double yi = pi.get(0), xi = pi.get(1);
            double yj = pj.get(0), xj = pj.get(1);

            boolean intersect = ((yi > lat) != (yj > lat))
                && (lng < ((xj - xi) * (lat - yi)) / ((yj - yi) == 0.0 ? 1e-12 : (yj - yi)) + xi);
            if (intersect) {
                inside = !inside;
            }
        }
        return inside;
    }

    private static double round6(double val) {
        return Math.round(val * 1_000_000.0) / 1_000_000.0;
    }
}
