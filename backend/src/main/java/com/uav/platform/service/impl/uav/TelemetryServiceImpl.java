package com.uav.platform.service.impl.uav;

import com.uav.platform.dto.request.uav.TelemetryReportRequest;
import com.uav.platform.dto.response.uav.TelemetryResponse;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.uav.UavTelemetry;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.uav.UavTelemetryRepository;
import com.uav.platform.service.mission.MissionAccessService;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.service.uav.TelemetryService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TelemetryServiceImpl implements TelemetryService {
    /** Device clocks may run slightly ahead; anything further in the future is rejected. */
    static final Duration CLOCK_SKEW = Duration.ofMinutes(5);

    private final UavTelemetryRepository telemetry;
    private final UavRepository uavs;
    private final MissionRepository missions;
    private final MissionAccessService missionAccess;
    private final PermissionService permissions;

    @Override
    @Transactional
    public TelemetryResponse ingest(Long uavId, TelemetryReportRequest r, String reporter) {
        if (!uavs.existsById(uavId)) throw SystemException.notFound("UAV not found");
        LocalDateTime now = LocalDateTime.now();
        if (r.recordedAt().isAfter(now.plus(CLOCK_SKEW)))
            throw SystemException.badRequest("TELEMETRY_TIMESTAMP_IN_FUTURE");
        if (r.missionId() != null) {
            Mission mission =
                    missions.findById(r.missionId())
                            .orElseThrow(() -> SystemException.notFound("Mission not found"));
            if (mission.getUav() == null || !uavId.equals(mission.getUav().getId()))
                throw SystemException.badRequest("TELEMETRY_MISSION_UAV_MISMATCH");
        }
        Long missionId = r.missionId();
        if (missionId == null)
            // Untagged samples belong to the flight in progress, so mission views can find them.
            missionId =
                    missions.findFirstByUavIdAndStatusOrderByIdDesc(
                                    uavId, MissionStatus.IN_PROGRESS)
                            .map(Mission::getId)
                            .orElse(null);
        UavTelemetry t = new UavTelemetry();
        t.setUavId(uavId);
        t.setMissionId(missionId);
        t.setRecordedAt(r.recordedAt());
        t.setReceivedAt(now);
        t.setLatitude(BigDecimal.valueOf(r.latitude()));
        t.setLongitude(BigDecimal.valueOf(r.longitude()));
        t.setAltitudeAglMeters(r.altitudeAglMeters());
        t.setGroundSpeedMs(r.groundSpeedMs());
        t.setHeadingDeg(r.headingDeg());
        t.setBatteryPct(r.batteryPct());
        t.setRtkStatus(r.rtkStatus());
        t.setSatellites(r.satellites());
        t.setReportedBy(reporter);
        return toResponse(telemetry.save(t), now);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<TelemetryResponse> latest(Long uavId) {
        LocalDateTime now = LocalDateTime.now();
        return telemetry.findFirstByUavIdOrderByRecordedAtDesc(uavId).map(t -> toResponse(t, now));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TelemetryResponse> latestForFleet() {
        LocalDateTime now = LocalDateTime.now();
        return telemetry.latestPerUav().stream().map(t -> toResponse(t, now)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<TelemetryResponse> latestForMission(Long missionId, Authentication auth) {
        Mission mission = missionAccess.accessible(missionId, auth);
        if (mission.getUav() == null) return Optional.empty();
        // Customers follow the live flight only; staff may review the mission's last position
        // later.
        if (!isStaffFor(mission, auth) && mission.getStatus() != MissionStatus.IN_PROGRESS)
            return Optional.empty();
        LocalDateTime now = LocalDateTime.now();
        // Only samples tagged with this mission: the same UAV may be flying another customer's job.
        return telemetry
                .findFirstByUavIdAndMissionIdOrderByRecordedAtDesc(
                        mission.getUav().getId(), mission.getId())
                .map(t -> toResponse(t, now));
    }

    private boolean isStaffFor(Mission mission, Authentication auth) {
        if (auth == null) return false;
        if (permissions != null && permissions.has(auth, "MISSION_VIEW_ALL")) return true;
        return mission.getOperator() != null
                && mission.getOperator().getUsername().equals(auth.getName());
    }

    static TelemetryResponse toResponse(UavTelemetry t, LocalDateTime now) {
        long age = Math.max(0, Duration.between(t.getRecordedAt(), now).getSeconds());
        return new TelemetryResponse(
                t.getUavId(),
                t.getMissionId(),
                t.getRecordedAt(),
                t.getLatitude().doubleValue(),
                t.getLongitude().doubleValue(),
                t.getAltitudeAglMeters(),
                t.getGroundSpeedMs(),
                t.getHeadingDeg(),
                t.getBatteryPct(),
                t.getRtkStatus(),
                t.getSatellites(),
                age,
                age > FRESH_SECONDS);
    }
}
