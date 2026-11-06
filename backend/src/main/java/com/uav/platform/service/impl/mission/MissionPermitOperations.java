package com.uav.platform.service.impl.mission;

import com.uav.platform.dto.request.airspace.AirspaceCheckRequest;
import com.uav.platform.dto.request.mission.FlightPlanRequest;
import com.uav.platform.dto.request.mission.MissionPermitUpsertRequest;
import com.uav.platform.dto.request.mission.MissionPermitVerifyRequest;
import com.uav.platform.dto.response.airspace.AirspaceCheckResponse;
import com.uav.platform.dto.response.airspace.AirspaceViolationResponse;
import com.uav.platform.dto.response.mission.FlightPlanResponse;
import com.uav.platform.dto.response.mission.MissionPermitResponse;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.enums.mission.FlightPermitStatus;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.error.SystemException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Flight permit mapping, airspace check extraction, and preflight permit verification rules.
 */
public final class MissionPermitOperations {

    private static final Set<MissionStatus> NON_PREFLIGHT_STATUSES =
            Set.of(
                    MissionStatus.IN_PROGRESS,
                    MissionStatus.COMPLETED,
                    MissionStatus.FAILED,
                    MissionStatus.CANCELLED,
                    MissionStatus.REJECTED);

    private MissionPermitOperations() {}

    public static MissionPermitResponse toResponse(Mission mission) {
        if (mission == null) return null;
        FlightPermitStatus status =
                mission.getPermitStatus() == null
                        ? FlightPermitStatus.NOT_REQUIRED
                        : mission.getPermitStatus();
        return new MissionPermitResponse(
                status,
                mission.getPermitNumber(),
                mission.getPermitAuthority(),
                mission.getPermitValidFrom(),
                mission.getPermitValidUntil(),
                mission.getPermitMaxAltitudeM(),
                mission.getPermitMediaId(),
                mission.getPermitVerifiedBy(),
                mission.getPermitVerifiedAt(),
                mission.getPermitNote());
    }

    public static AirspaceCheckRequest toCheckRequest(
            FlightPlanRequest plan, BigDecimal fallbackLat, BigDecimal fallbackLng) {
        if (plan != null) {
            return new AirspaceCheckRequest(
                    plan.areaType(),
                    plan.vertices(),
                    plan.radiusMeters(),
                    plan.takeoffLatitude(),
                    plan.takeoffLongitude(),
                    plan.altitudeAglMeters());
        }
        if (fallbackLat != null && fallbackLng != null) {
            return new AirspaceCheckRequest(
                    "POINT",
                    List.of(),
                    null,
                    fallbackLat.doubleValue(),
                    fallbackLng.doubleValue(),
                    null);
        }
        return null;
    }

    public static AirspaceCheckRequest toCheckRequest(
            FlightPlanResponse storedPlan, BigDecimal fallbackLat, BigDecimal fallbackLng) {
        if (storedPlan != null && storedPlan.areaType() != null) {
            Double takeoffLat =
                    storedPlan.takeoffLatitude() != null
                            ? storedPlan.takeoffLatitude()
                            : storedPlan.centerLatitude();
            Double takeoffLng =
                    storedPlan.takeoffLongitude() != null
                            ? storedPlan.takeoffLongitude()
                            : storedPlan.centerLongitude();
            return new AirspaceCheckRequest(
                    storedPlan.areaType(),
                    storedPlan.vertices(),
                    storedPlan.radiusMeters(),
                    takeoffLat,
                    takeoffLng,
                    storedPlan.altitudeAglMeters());
        }
        if (fallbackLat != null && fallbackLng != null) {
            return new AirspaceCheckRequest(
                    "POINT",
                    List.of(),
                    null,
                    fallbackLat.doubleValue(),
                    fallbackLng.doubleValue(),
                    null);
        }
        return null;
    }

    public static void rejectIfBlocked(AirspaceCheckResponse check) {
        if (check != null && check.blocked()) {
            String names =
                    check.violations().stream()
                            .filter(AirspaceViolationResponse::blocking)
                            .map(v -> v.code() + " (" + v.name() + ")")
                            .collect(Collectors.joining(", "));
            throw SystemException.badRequest(
                            "Vùng bay vi phạm khu vực cấm bay: " + names,
                            "AIRSPACE_PROHIBITED_ZONE")
                    .at("flightPlan.vertices");
        }
    }

    public static void updatePermitRequirement(
            Mission mission, boolean needsPermit, boolean allowResetPending) {
        boolean hasPermitNumber =
                mission.getPermitNumber() != null && !mission.getPermitNumber().isBlank();
        if (needsPermit) {
            if (mission.getPermitStatus() == null
                    || mission.getPermitStatus() == FlightPermitStatus.NOT_REQUIRED) {
                mission.setPermitStatus(FlightPermitStatus.PENDING);
            }
        } else if (allowResetPending
                && mission.getPermitStatus() == FlightPermitStatus.PENDING
                && !hasPermitNumber) {
            mission.setPermitStatus(FlightPermitStatus.NOT_REQUIRED);
        }
    }

    /**
     * Invalidates any prior permit verification/rejection whenever a mission's draft schedule,
     * location, or flight plan is edited so altered geometry or altitude must be re-verified.
     */
    public static void invalidateOnDraftEdit(Mission mission, boolean needsPermit) {
        FlightPermitStatus current = mission.getPermitStatus();
        boolean hasPermitNumber =
                mission.getPermitNumber() != null && !mission.getPermitNumber().isBlank();
        if (current == FlightPermitStatus.VERIFIED || current == FlightPermitStatus.REJECTED) {
            mission.setPermitVerifiedBy(null);
            mission.setPermitVerifiedAt(null);
            if (hasPermitNumber) {
                mission.setPermitStatus(FlightPermitStatus.SUBMITTED);
            } else {
                mission.setPermitStatus(
                        needsPermit ? FlightPermitStatus.PENDING : FlightPermitStatus.NOT_REQUIRED);
            }
            return;
        }
        updatePermitRequirement(mission, needsPermit, true);
    }

    public static void applyUpsert(Mission mission, MissionPermitUpsertRequest request) {
        requireMutableMission(mission);
        if (request.validFrom() == null
                || request.validUntil() == null
                || !request.validUntil().isAfter(request.validFrom())) {
            throw SystemException.badRequest(
                            "Thời điểm hết hiệu lực giấy phép phải sau thời điểm bắt đầu hiệu lực.",
                            "PERMIT_VALIDITY_RANGE_INVALID")
                    .at("validUntil");
        }
        mission.setPermitNumber(request.permitNumber().trim());
        mission.setPermitAuthority(request.permitAuthority().trim());
        mission.setPermitValidFrom(request.validFrom());
        mission.setPermitValidUntil(request.validUntil());
        mission.setPermitMaxAltitudeM(request.maxAltitudeMeters());
        mission.setPermitMediaId(request.permitMediaId());
        mission.setPermitNote(
                request.note() == null || request.note().isBlank() ? null : request.note().trim());
        mission.setPermitStatus(FlightPermitStatus.SUBMITTED);
        mission.setPermitVerifiedBy(null);
        mission.setPermitVerifiedAt(null);
    }

    public static void applyVerification(
            Mission mission, MissionPermitVerifyRequest request, String verifierUsername) {
        requireMutableMission(mission);
        if (mission.getPermitNumber() == null || mission.getPermitNumber().isBlank()) {
            throw SystemException.conflict(
                    "Nhiệm vụ chưa có hồ sơ giấy phép bay để thẩm định.",
                    "MISSION_PERMIT_NOT_SUBMITTED");
        }
        boolean approved = Boolean.TRUE.equals(request.approved());
        mission.setPermitStatus(
                approved ? FlightPermitStatus.VERIFIED : FlightPermitStatus.REJECTED);
        mission.setPermitVerifiedBy(verifierUsername);
        mission.setPermitVerifiedAt(LocalDateTime.now());
        if (request.note() != null) {
            mission.setPermitNote(request.note().isBlank() ? null : request.note().trim());
        }
    }

    public static void enforcePreflightPermit(Mission mission) {
        enforcePreflightPermit(mission, false, LocalDateTime.now());
    }

    public static void enforcePreflightPermit(
            Mission mission, boolean airspaceRequiresPermit, LocalDateTime now) {
        FlightPermitStatus status = mission.getPermitStatus();
        boolean permitRequired =
                airspaceRequiresPermit
                        || (status != null && status != FlightPermitStatus.NOT_REQUIRED);
        if (!permitRequired) {
            return;
        }
        if (status != FlightPermitStatus.VERIFIED) {
            throw SystemException.conflict(
                    "Nhiệm vụ yêu cầu giấy phép bay đã được thẩm định trước khi cất cánh.",
                    "MISSION_PERMIT_REQUIRED");
        }
        LocalDateTime validFrom = mission.getPermitValidFrom();
        LocalDateTime validUntil = mission.getPermitValidUntil();
        boolean scheduleBeforeStart =
                validFrom != null
                        && ((mission.getStartTime() != null
                                        && mission.getStartTime().isBefore(validFrom))
                                || (now != null && now.isBefore(validFrom)));
        boolean scheduleAfterEnd =
                validUntil != null
                        && ((mission.getExpectedEndTime() != null
                                        && mission.getExpectedEndTime().isAfter(validUntil))
                                || (now != null && now.isAfter(validUntil)));
        if (scheduleBeforeStart || scheduleAfterEnd) {
            throw SystemException.conflict(
                    "Thời gian thực hiện nhiệm vụ nằm ngoài hiệu lực của giấy phép bay.",
                    "MISSION_PERMIT_EXPIRED");
        }
        Integer maxAlt = mission.getPermitMaxAltitudeM();
        if (maxAlt != null) {
            FlightPlanResponse storedPlan = FlightPlanOperations.read(mission.getFlightPlan());
            if (storedPlan != null
                    && storedPlan.altitudeAglMeters() != null
                    && storedPlan.altitudeAglMeters() > maxAlt) {
                throw SystemException.conflict(
                        "Độ cao kế hoạch bay ("
                                + storedPlan.altitudeAglMeters()
                                + "m) vượt trần cho phép của giấy phép bay ("
                                + maxAlt
                                + "m AGL).",
                        "MISSION_PERMIT_ALTITUDE_EXCEEDED");
            }
        }
    }

    private static void requireMutableMission(Mission mission) {
        if (mission.getStatus() != null && NON_PREFLIGHT_STATUSES.contains(mission.getStatus())) {
            throw SystemException.conflict(
                    "Chỉ được cập nhật hoặc thẩm định giấy phép bay trước khi nhiệm vụ cất cánh.",
                    "MISSION_INVALID_STATUS");
        }
    }
}
