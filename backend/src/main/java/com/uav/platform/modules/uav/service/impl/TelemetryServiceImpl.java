package com.uav.platform.modules.uav.service.impl;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.mission.service.MissionAccessService;
import com.uav.platform.modules.uav.dto.request.TelemetryReportRequest;
import com.uav.platform.modules.uav.dto.response.TelemetryResponse;
import com.uav.platform.modules.uav.entity.UavTelemetry;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.uav.repository.UavTelemetryRepository;
import com.uav.platform.modules.uav.service.TelemetryService;

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

    @Override
    @Transactional
    public TelemetryResponse ingest(Long uavId, TelemetryReportRequest r, String reporter) {
        if (!uavs.existsById(uavId)) throw SystemException.notFound("UAV not found");
        LocalDateTime now = LocalDateTime.now();
        if (r.recordedAt().isAfter(now.plus(CLOCK_SKEW))) throw SystemException.badRequest("TELEMETRY_TIMESTAMP_IN_FUTURE");
        if (r.missionId() != null) {
            Mission mission = missions.findById(r.missionId()).orElseThrow(() -> SystemException.notFound("Mission not found"));
            if (mission.getUav() == null || !uavId.equals(mission.getUav().getId()))
                throw SystemException.badRequest("TELEMETRY_MISSION_UAV_MISMATCH");
        }
        UavTelemetry t = new UavTelemetry();
        t.setUavId(uavId);
        t.setMissionId(r.missionId());
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
        return mission.getUav() == null ? Optional.empty() : latest(mission.getUav().getId());
    }

    static TelemetryResponse toResponse(UavTelemetry t, LocalDateTime now) {
        long age = Math.max(0, Duration.between(t.getRecordedAt(), now).getSeconds());
        return new TelemetryResponse(t.getUavId(), t.getMissionId(), t.getRecordedAt(), t.getLatitude().doubleValue(),
                t.getLongitude().doubleValue(), t.getAltitudeAglMeters(), t.getGroundSpeedMs(), t.getHeadingDeg(),
                t.getBatteryPct(), t.getRtkStatus(), t.getSatellites(), age, age > FRESH_SECONDS);
    }
}
