package com.uav.platform.modules.sar.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.enums.MissionStatus;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.notification.dto.request.CreateNotificationRequest;
import com.uav.platform.modules.notification.enums.NotificationType;
import com.uav.platform.modules.notification.service.NotificationService;
import com.uav.platform.modules.sar.dto.record.AlertResult;
import com.uav.platform.modules.sar.dto.request.FlightPlanRequest;
import com.uav.platform.modules.sar.dto.request.RescueDispatchRequest;
import com.uav.platform.modules.sar.dto.request.SarMissionRequest;
import com.uav.platform.modules.sar.dto.request.TelemetryEvaluateRequest;
import com.uav.platform.modules.sar.dto.response.FlightPlanResponse;
import com.uav.platform.modules.sar.dto.response.RescueDispatchResponse;
import com.uav.platform.modules.sar.dto.response.SarCockpitMissionResponse;
import com.uav.platform.modules.sar.dto.response.SarMissionResponse;
import com.uav.platform.modules.sar.dto.response.TelemetryEvaluateResponse;
import com.uav.platform.modules.sar.dto.response.WaypointResponse;
import com.uav.platform.modules.sar.entity.SarMission;
import com.uav.platform.modules.sar.enums.SarStatus;
import com.uav.platform.modules.sar.mapper.SarMapper;
import com.uav.platform.modules.sar.repository.SarMissionRepository;
import com.uav.platform.modules.sar.service.SarService;
import com.uav.platform.modules.sar.specification.SarSpecifications;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.webhook.service.WebhookService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
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
public class SarServiceImpl implements SarService {

    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    private final SarMissionRepository sarRepository;
    private final MissionRepository missionRepository;
    private final NotificationService notificationService;
    private final WebhookService webhookService;
    private final com.uav.platform.modules.permission.service.PermissionService permissionService;
    private final SarMapper sarMapper;

    public SarServiceImpl(SarMissionRepository sarRepository, MissionRepository missionRepository) {
        this(sarRepository, missionRepository, null, null, null);
    }

    public SarServiceImpl(
            SarMissionRepository sarRepository,
            MissionRepository missionRepository,
            NotificationService notificationService,
            WebhookService webhookService) {
        this(sarRepository, missionRepository, notificationService, webhookService, null);
    }

    public SarServiceImpl(
            SarMissionRepository sarRepository,
            MissionRepository missionRepository,
            NotificationService notificationService,
            WebhookService webhookService,
            com.uav.platform.modules.permission.service.PermissionService permissionService) {
        this(
                sarRepository,
                missionRepository,
                notificationService,
                webhookService,
                permissionService,
                org.mapstruct.factory.Mappers.getMapper(SarMapper.class));
    }

    @Autowired
    public SarServiceImpl(
            SarMissionRepository sarRepository,
            MissionRepository missionRepository,
            @Autowired(required = false) NotificationService notificationService,
            @Autowired(required = false) WebhookService webhookService,
            @Autowired(required = false)
                    com.uav.platform.modules.permission.service.PermissionService permissionService,
            SarMapper sarMapper) {
        this.sarRepository = sarRepository;
        this.missionRepository = missionRepository;
        this.notificationService = notificationService;
        this.webhookService = webhookService;
        this.permissionService = permissionService;
        this.sarMapper = sarMapper;
    }

    private void requireMissionAccess(
            Mission mission, Authentication auth, boolean requireOperationalAuthority) {
        if (mission == null
                || auth == null
                || !auth.isAuthenticated()
                || permissionService == null) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Authentication required");
        }
        if (permissionService.has(auth, "MISSION_VIEW_ALL")
                || permissionService.has(auth, "USER_MANAGE")) {
            return;
        }
        String actor = auth.getName();
        boolean isOperator =
                mission.getOperator() != null
                        && java.util.Objects.equals(mission.getOperator().getUsername(), actor);
        boolean isCustomer =
                mission.getCustomer() != null
                        && java.util.Objects.equals(mission.getCustomer().getUsername(), actor);
        if (!isOperator && !isCustomer) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "You do not have permission to access this mission");
        }
        if (requireOperationalAuthority && !isOperator) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Only assigned operators or commanders can modify SAR operational status");
        }
    }

    @Override
    public SarMissionResponse registerSar(
            SarMissionRequest request, Authentication authentication) {
        Mission mission =
                missionRepository
                        .findById(request.missionId())
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "Mission not found with id: "
                                                        + request.missionId()));
        requireMissionAccess(mission, authentication, false);
        requireMissionOpen(mission);

        SarMission existing = sarRepository.findByMissionId(request.missionId()).orElse(null);
        if (existing != null) {
            // Editing the search area/LKP of a live search needs the version the editor saw.
            if (request.expectedVersion() == null) {
                if (mission.getStatus() != MissionStatus.DRAFT)
                    throw SystemException.badRequest(
                            "Cần expectedVersion để sửa vùng tìm kiếm đã đăng ký.",
                            "SAR_VERSION_REQUIRED");
            } else if (request.expectedVersion() != existing.getVersion()) {
                throw SystemException.conflict(
                        "Thông tin SAR đã được người khác cập nhật; tải lại rồi thử lại.",
                        "SAR_STALE");
            }
        }
        SarMission sar =
                java.util.Optional.ofNullable(existing)
                        .orElseGet(
                                () ->
                                        SarMissionOperations.create(
                                                mission,
                                                request.searchAreaPolygon(),
                                                request.lkpLatitude(),
                                                request.lkpLongitude(),
                                                request.driftRadiusMeters(),
                                                request.emergencyContact(),
                                                request.victimCountEstimated(),
                                                request.notes()));

        sar.setSearchAreaPolygon(request.searchAreaPolygon());
        sar.setLkpLatitude(request.lkpLatitude());
        sar.setLkpLongitude(request.lkpLongitude());
        if (request.driftRadiusMeters() != null)
            sar.setDriftRadiusMeters(request.driftRadiusMeters());
        if (request.emergencyContact() != null) sar.setEmergencyContact(request.emergencyContact());
        if (request.victimCountEstimated() != null)
            sar.setVictimCountEstimated(request.victimCountEstimated());
        if (request.notes() != null) sar.setNotes(request.notes());

        SarMission saved = sarRepository.saveAndFlush(sar);
        return sarMapper.toSarMissionResponse(saved);
    }

    /** Mission states in which SAR data and status are frozen. */
    static final java.util.Set<MissionStatus> CLOSED_MISSION_STATUSES =
            java.util.EnumSet.of(
                    MissionStatus.COMPLETED,
                    MissionStatus.FAILED,
                    MissionStatus.CANCELLED,
                    MissionStatus.REJECTED);

    static void requireMissionOpen(Mission mission) {
        if (mission.getStatus() != null && CLOSED_MISSION_STATUSES.contains(mission.getStatus()))
            throw SystemException.conflict(
                    "Nhiệm vụ đã kết thúc; không thể thay đổi thông tin SAR.",
                    "SAR_MISSION_CLOSED");
    }

    /**
     * SAR status machine. SEARCHING <-> SUSPENDED, SEARCHING/SUSPENDED -> TARGET_LOCATED,
     * TARGET_LOCATED -> SEARCHING (false positive) or RESCUED; RESCUED is final. Searching, locating
     * and rescuing happen in flight only (mission IN_PROGRESS); suspending is allowed on any open
     * mission. Re-sending the current status is a no-op.
     */
    static void requireSarTransition(SarStatus from, SarStatus to, MissionStatus missionStatus) {
        java.util.Set<SarStatus> allowed =
                switch (from == null ? SarStatus.SEARCHING : from) {
                    case SEARCHING ->
                            java.util.EnumSet.of(SarStatus.SUSPENDED, SarStatus.TARGET_LOCATED);
                    case SUSPENDED ->
                            java.util.EnumSet.of(SarStatus.SEARCHING, SarStatus.TARGET_LOCATED);
                    case TARGET_LOCATED ->
                            java.util.EnumSet.of(SarStatus.SEARCHING, SarStatus.RESCUED);
                    case RESCUED -> java.util.EnumSet.noneOf(SarStatus.class);
                };
        if (!allowed.contains(to))
            throw SystemException.conflict(
                    "Không thể chuyển trạng thái SAR từ " + from + " sang " + to + ".",
                    "SAR_STATUS_TRANSITION_INVALID");
        if (to != SarStatus.SUSPENDED && missionStatus != MissionStatus.IN_PROGRESS)
            throw SystemException.conflict(
                    "Chỉ cập nhật tìm kiếm khi nhiệm vụ đang bay.", "SAR_MISSION_NOT_IN_PROGRESS");
    }

    @Override
    @Transactional(readOnly = true)
    public List<SarCockpitMissionResponse> listForCockpit(
            boolean includeClosed, int page, int size, Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || permissionService == null)
            throw new org.springframework.security.access.AccessDeniedException(
                    "Authentication required");
        boolean all =
                permissionService.has(authentication, "MISSION_VIEW_ALL")
                        || permissionService.has(authentication, "USER_MANAGE");
        Specification<SarMission> spec =
                all
                        ? Specification.unrestricted()
                        : SarSpecifications.visibleTo(authentication.getName());
        if (!includeClosed) spec = spec.and(SarSpecifications.notSarStatus(SarStatus.RESCUED));
        var pageable =
                org.springframework.data.domain.PageRequest.of(
                        Math.max(0, page),
                        Math.max(1, Math.min(200, size)),
                        Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id")));
        return sarRepository.findAll(spec, pageable).stream()
                .map(SarServiceImpl::toCockpit)
                .toList();
    }

    static SarCockpitMissionResponse toCockpit(SarMission sar) {
        Mission m = sar.getMission();
        var uav = m.getUav();
        Station station =
                m.getStation() != null ? m.getStation() : uav != null ? uav.getStation() : null;
        return new SarCockpitMissionResponse(
                sar.getId(),
                m.getId(),
                m.getCode(),
                m.getTitle(),
                m.getStatus() != null ? m.getStatus().name() : null,
                m.getPriority() != null ? m.getPriority().name() : null,
                sar.getSarStatus(),
                sar.getLkpLatitude(),
                sar.getLkpLongitude(),
                sar.getDriftRadiusMeters(),
                sar.getSearchAreaPolygon(),
                sar.getVictimCountEstimated(),
                sar.getEmergencyContact(),
                uav != null ? uav.getId() : null,
                uav != null ? uav.getModel() : null,
                uav != null ? uav.getSerialNumber() : null,
                m.getOperator() != null ? m.getOperator().getFullName() : null,
                station != null ? station.getName() : null,
                station != null ? station.getLatitude() : null,
                station != null ? station.getLongitude() : null,
                m.getStartTime(),
                sar.getUpdatedAt());
    }

    @Override
    public RescueDispatchResponse requestReturnToHome(
            Long missionId, Authentication authentication) {
        Mission mission = requiredMission(missionId, authentication);
        if (mission.getUav() == null) throw SystemException.badRequest("SAR_NO_UAV_ASSIGNED");
        Map<String, Object> data = new HashMap<>();
        data.put("missionId", mission.getId());
        data.put("missionCode", mission.getCode());
        data.put("uavId", mission.getUav().getId());
        data.put("uavSerialNumber", mission.getUav().getSerialNumber());
        data.put("requestedBy", authentication.getName());
        data.put("requestedAt", LocalDateTime.now().toString());
        String outcome =
                webhookService != null
                        ? webhookService.dispatchEvent("SAR_RTH_REQUESTED", data)
                        : "UNCONFIGURED";
        sarRepository
                .findByMissionId(missionId)
                .ifPresent(
                        sar -> {
                            if (sar.getSarStatus() == SarStatus.SEARCHING) {
                                sar.setSarStatus(SarStatus.SUSPENDED);
                                sarRepository.save(sar);
                            }
                        });
        return new RescueDispatchResponse(
                outcome,
                false,
                "SAR_RTH_REQUESTED",
                mission.getId(),
                LocalDateTime.now().toString(),
                "QUEUED".equals(outcome)
                        ? "RTH request queued for the ground-station integration; awaiting UAV confirmation."
                        : "No ground-station webhook subscribes to SAR_RTH_REQUESTED; recall the UAV from the GCS.");
    }

    @Override
    @Transactional(readOnly = true)
    public SarMissionResponse getByMissionId(Long missionId, Authentication authentication) {
        SarMission sar =
                sarRepository
                        .findByMissionId(missionId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "SAR details not found for mission id: "
                                                        + missionId));
        requireMissionAccess(sar.getMission(), authentication, false);
        return sarMapper.toSarMissionResponse(sar);
    }

    @Override
    public SarMissionResponse updateSarStatus(
            Long missionId, SarStatus status, Authentication authentication) {
        SarMission sar =
                sarRepository
                        .findByMissionId(missionId)
                        .orElseThrow(
                                () ->
                                        SystemException.notFound(
                                                "SAR details not found for mission id: "
                                                        + missionId));
        requireMissionAccess(sar.getMission(), authentication, true);
        if (status == null) throw SystemException.badRequest("SAR_STATUS_REQUIRED");
        requireMissionOpen(sar.getMission());
        if (sar.getSarStatus() == status) return sarMapper.toSarMissionResponse(sar);
        requireSarTransition(sar.getSarStatus(), status, sar.getMission().getStatus());
        sar.setSarStatus(status);
        SarMission saved = sarRepository.saveAndFlush(sar);
        return sarMapper.toSarMissionResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public FlightPlanResponse generateFlightPlan(
            FlightPlanRequest request, Authentication authentication) {
        double sweepWidth =
                (request.sweepWidthMeters() != null && request.sweepWidthMeters() > 5.0)
                        ? request.sweepWidthMeters()
                        : 50.0;
        int maxLegs =
                (request.maxLegs() != null && request.maxLegs() >= 2 && request.maxLegs() <= 40)
                        ? request.maxLegs()
                        : 10;
        double cruiseSpeed =
                (request.cruiseSpeedMs() != null && request.cruiseSpeedMs() > 1.0)
                        ? request.cruiseSpeedMs()
                        : 12.0;

        List<WaypointResponse> waypoints = new ArrayList<>();
        double currentLat = request.lkpLat();
        double currentLng = request.lkpLng();
        waypoints.add(
                new WaypointResponse(
                        0, round6(currentLat), round6(currentLng), 0.0, 0.0, "LKP (Datum)"));

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
            waypoints.add(
                    new WaypointResponse(
                            leg,
                            round6(currentLat),
                            round6(currentLng),
                            Math.round(legDistance * 10.0) / 10.0,
                            bearing,
                            "WP-" + leg));
        }

        double estimatedFlightMinutes =
                Math.round(((totalDistance / cruiseSpeed) / 60.0) * 10.0) / 10.0;
        return new FlightPlanResponse(
                request.missionId(),
                "IAMSAR_EXPANDING_SQUARE",
                request.lkpLat(),
                request.lkpLng(),
                sweepWidth,
                Math.round(totalDistance),
                estimatedFlightMinutes,
                waypoints);
    }

    @Override
    public TelemetryEvaluateResponse evaluateTelemetry(
            TelemetryEvaluateRequest request, Authentication authentication) {
        Mission mission = requiredMission(request.missionId(), authentication);
        if (mission.getUav() == null
                || request.uavCode() == null
                || !request.uavCode().equals(mission.getUav().getSerialNumber())) {
            throw SystemException.badRequest(
                    "Telemetry UAV must match the UAV assigned to this mission");
        }
        double cruiseSpeed = request.cruiseSpeedMs() > 0 ? request.cruiseSpeedMs() : 12.0;
        double dischargeRate =
                (request.dischargeRatePctPerMin() != null && request.dischargeRatePctPerMin() > 0)
                        ? request.dischargeRatePctPerMin()
                        : 2.2;
        double safetyReserve =
                (request.safetyReservePct() != null && request.safetyReservePct() >= 0)
                        ? request.safetyReservePct()
                        : 20.0;

        double distMeters =
                haversineDistance(
                        request.currentLat(), request.currentLng(),
                        request.homeLat(), request.homeLng());
        double returnTimeSec = distMeters / cruiseSpeed;
        double returnTimeMin = returnTimeSec / 60.0;
        double flightDrainPct = returnTimeMin * dischargeRate;
        double requiredBatteryPct = Math.round((flightDrainPct + safetyReserve) * 10.0) / 10.0;
        boolean mustTriggerRth = request.batteryPct() <= requiredBatteryPct;

        String rthStatus = "SAFE";
        if (mustTriggerRth) {
            rthStatus = "CRITICAL_RECOMMEND_RTH";
        } else if (request.batteryPct() <= requiredBatteryPct + 8.0) {
            rthStatus = "WARNING_PREPARE_RTH";
        }

        boolean insideGeofence =
                isPointInsideGeofence(
                        request.currentLat(), request.currentLng(), request.geofencePolygon());

        AlertResult alert = new AlertResult(false, "NOT_REQUESTED");
        String recommendation = "Flight parameters nominal. Maintain IAMSAR search pattern.";
        if (!insideGeofence && mustTriggerRth) {
            recommendation =
                    "CRITICAL: Geofence breach AND low battery! Return-To-Home (RTH) recommended; no flight command sent.";
        } else if (!insideGeofence) {
            recommendation =
                    "WARNING: UAV outside designated SAR geofence polygon! Return to sector boundary recommended; no flight command sent.";
        } else if (mustTriggerRth) {
            recommendation =
                    "CRITICAL: Battery at RTH threshold ("
                            + requiredBatteryPct
                            + "%). Execute Return-To-Home immediately.";
        } else if ("WARNING_PREPARE_RTH".equals(rthStatus)) {
            recommendation =
                    "CAUTION: Approaching RTH battery threshold ("
                            + requiredBatteryPct
                            + "%). Prepare recovery.";
        }

        if (mustTriggerRth || !insideGeofence) {
            alert =
                    triggerSafetyAlert(
                            mission,
                            request,
                            distMeters,
                            requiredBatteryPct,
                            mustTriggerRth,
                            insideGeofence,
                            recommendation);
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
                alert.accepted(),
                recommendation,
                false,
                alert.deliveryStatus());
    }

    @Override
    public RescueDispatchResponse dispatchRescueCoordinates(
            Long missionId, RescueDispatchRequest request, Authentication authentication) {
        requiredMission(missionId, authentication);
        sarRepository
                .findByMissionId(missionId)
                .ifPresent(
                        sar -> {
                            sar.setSarStatus(SarStatus.TARGET_LOCATED);
                            sarRepository.save(sar);
                        });

        Map<String, Object> eventData = new HashMap<>();
        if (request != null && request.payload() != null) {
            eventData.putAll(request.payload());
        }
        eventData.put("missionId", missionId != null ? missionId : 1L);
        eventData.put(
                "dispatchedBy", authentication != null ? authentication.getName() : "OPERATOR");
        eventData.put("dispatchedAt", LocalDateTime.now().toString());

        String outcome =
                webhookService != null
                        ? webhookService.dispatchEvent("SAR_EMERGENCY_TRIGGERED", eventData)
                        : "UNCONFIGURED";

        if (notificationService != null && missionId != null) {
            missionRepository
                    .findById(missionId)
                    .ifPresent(
                            mission -> {
                                if (mission.getCustomer() != null
                                        && mission.getCustomer().getId() != null) {
                                    try {
                                        notificationService.sendNotification(
                                                new CreateNotificationRequest(
                                                        mission.getCustomer().getId(),
                                                        "SAR Target Located - Mission "
                                                                + mission.getCode(),
                                                        "Tọa độ cứu hộ đã được ghi nhận nội bộ, chưa xác nhận giao tới cơ quan cứu hộ: "
                                                                + eventData.getOrDefault(
                                                                        "coordinates",
                                                                        "Chưa cung cấp"),
                                                        NotificationType.SAR_TARGET_FOUND,
                                                        "MISSION",
                                                        mission.getId()));
                                    } catch (RuntimeException ignored) {
                                    }
                                }
                            });
        }

        return new RescueDispatchResponse(
                outcome,
                false,
                "SAR_EMERGENCY_TRIGGERED",
                missionId != null ? missionId : 1L,
                LocalDateTime.now().toString(),
                "Đã ghi nhận cảnh báo cứu hộ nội bộ. Chưa có xác nhận từ cơ quan cứu hộ; không gửi lệnh điều khiển UAV.");
    }

    private Mission requiredMission(Long id, Authentication auth) {
        if (id == null) throw SystemException.badRequest("missionId is required");
        Mission mission =
                missionRepository
                        .findById(id)
                        .orElseThrow(() -> SystemException.notFound("Mission not found"));
        requireMissionAccess(mission, auth, true);
        return mission;
    }

    private AlertResult triggerSafetyAlert(
            Mission mission,
            TelemetryEvaluateRequest req,
            double distMeters,
            double requiredBatteryPct,
            boolean mustTriggerRth,
            boolean insideGeofence,
            String recommendation) {
        boolean queued = false;
        if (webhookService != null) {
            Map<String, Object> data =
                    Map.of(
                            "missionId",
                            req.missionId(),
                            "uavCode",
                            req.uavCode(),
                            "batteryPct",
                            req.batteryPct(),
                            "requiredBatteryPct",
                            requiredBatteryPct,
                            "distanceToHomeMeters",
                            Math.round(distMeters),
                            "insideGeofence",
                            insideGeofence,
                            "recommendation",
                            recommendation);
            if (!insideGeofence)
                queued = "QUEUED".equals(webhookService.dispatchEvent("GEOFENCE_BREACH", data));
            if (mustTriggerRth)
                queued =
                        "QUEUED".equals(webhookService.dispatchEvent("BATTERY_CRITICAL_RTH", data))
                                || queued;
        }
        boolean notified = false;
        Long userId =
                mission.getOperator() != null
                        ? mission.getOperator().getId()
                        : mission.getCustomer() != null ? mission.getCustomer().getId() : null;
        if (notificationService != null && userId != null) {
            notificationService.sendNotification(
                    new CreateNotificationRequest(
                            userId,
                            "UAV Safety Alert: " + req.uavCode(),
                            recommendation,
                            NotificationType.SYSTEM,
                            "MISSION",
                            mission.getId()));
            notified = true;
        }
        return new AlertResult(queued || notified, queued ? "QUEUED" : "UNCONFIGURED");
    }

    public static double haversineDistance(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a =
                Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
                        + Math.cos(Math.toRadians(lat1))
                                * Math.cos(Math.toRadians(lat2))
                                * Math.sin(dLng / 2.0)
                                * Math.sin(dLng / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return EARTH_RADIUS_METERS * c;
    }

    public static double[] offsetCoordinate(
            double lat, double lng, double distanceMeters, double bearingDeg) {
        double angularDist = distanceMeters / EARTH_RADIUS_METERS;
        double bearingRad = Math.toRadians(bearingDeg);
        double lat1 = Math.toRadians(lat);
        double lng1 = Math.toRadians(lng);

        double lat2 =
                Math.asin(
                        Math.sin(lat1) * Math.cos(angularDist)
                                + Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearingRad));
        double lng2 =
                lng1
                        + Math.atan2(
                                Math.sin(bearingRad) * Math.sin(angularDist) * Math.cos(lat1),
                                Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2));
        return new double[] {Math.toDegrees(lat2), Math.toDegrees(lng2)};
    }

    public static boolean isPointInsideGeofence(
            double lat, double lng, List<List<Double>> polygon) {
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

            boolean intersect =
                    ((yi > lat) != (yj > lat))
                            && (lng
                                    < ((xj - xi) * (lat - yi))
                                                    / ((yj - yi) == 0.0 ? 1e-12 : (yj - yi))
                                            + xi);
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
