package com.uav.platform.modules.dashboard.service.impl;

import com.uav.platform.modules.dashboard.dto.response.FleetMapResponse;
import com.uav.platform.modules.dashboard.dto.response.FleetMapResponse.ActiveMission;
import com.uav.platform.modules.dashboard.dto.response.FleetMapResponse.StationPin;
import com.uav.platform.modules.dashboard.dto.response.FleetMapResponse.UavPin;
import com.uav.platform.modules.dashboard.service.FleetMapService;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.enums.MissionStatus;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.station.entity.Station;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.dto.response.TelemetryResponse;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.enums.UavStatus;
import com.uav.platform.modules.uav.repository.UavRepository;
import com.uav.platform.modules.uav.service.TelemetryService;

import lombok.RequiredArgsConstructor;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FleetMapServiceImpl implements FleetMapService {
    /** Missions that still hold their UAV; the earliest of these is the one the UAV is serving. */
    static final List<MissionStatus> HOLDING =
            List.of(
                    MissionStatus.IN_PROGRESS,
                    MissionStatus.READY,
                    MissionStatus.RESOURCE_RESERVED,
                    MissionStatus.CONFIRMED);

    private final UavRepository uavs;
    private final StationRepository stations;
    private final MissionRepository missions;
    private final TelemetryService telemetry;

    @Override
    @Transactional(readOnly = true)
    public FleetMapResponse fleetMap() {
        List<Uav> fleet = uavs.findAll();
        Map<Long, TelemetryResponse> live =
                telemetry.latestForFleet().stream()
                        .filter(t -> !t.stale())
                        .collect(Collectors.toMap(TelemetryResponse::uavId, t -> t));
        Map<Long, Mission> active =
                activeMissionByUav(
                        missions.findAll(
                                (Specification<Mission>)
                                        (r, q, cb) ->
                                                cb.and(
                                                        cb.isNotNull(r.get("uav")),
                                                        r.get("status").in(HOLDING))));
        Map<Long, Long> perStation =
                fleet.stream()
                        .filter(u -> u.getStation() != null)
                        .collect(
                                Collectors.groupingBy(
                                        u -> u.getStation().getId(), Collectors.counting()));
        List<UavPin> pins =
                fleet.stream()
                        .sorted(Comparator.comparing(Uav::getId))
                        .map(u -> withTelemetry(pin(u, active.get(u.getId())), live.get(u.getId())))
                        .toList();
        List<StationPin> stationPins =
                stations.findAll().stream()
                        .sorted(Comparator.comparing(Station::getId))
                        .map(
                                s ->
                                        new StationPin(
                                                s.getId(),
                                                s.getCode(),
                                                s.getName(),
                                                s.getLatitude(),
                                                s.getLongitude(),
                                                s.getStatus() == null ? null : s.getStatus().name(),
                                                perStation.getOrDefault(s.getId(), 0L)))
                        .toList();
        return new FleetMapResponse(pins, stationPins, LocalDateTime.now());
    }

    /** One mission per UAV: an in-progress mission wins, otherwise the earliest scheduled one. */
    static Map<Long, Mission> activeMissionByUav(List<Mission> holding) {
        Comparator<Mission> priority =
                Comparator.comparingInt((Mission m) -> HOLDING.indexOf(m.getStatus()))
                        .thenComparing(
                                Mission::getStartTime,
                                Comparator.nullsLast(Comparator.naturalOrder()));
        Map<Long, Mission> result = new HashMap<>();
        for (Mission m : holding) {
            if (m.getUav() == null) continue;
            result.merge(m.getUav().getId(), m, (a, b) -> priority.compare(a, b) <= 0 ? a : b);
        }
        return result;
    }

    /** A fresh telemetry fix (within the freshness window) beats any derived position. */
    static UavPin withTelemetry(UavPin pin, TelemetryResponse fix) {
        if (fix == null) return pin;
        return new UavPin(
                pin.id(),
                pin.model(),
                pin.serialNumber(),
                pin.manufacturer(),
                pin.status(),
                pin.stationId(),
                pin.stationName(),
                pin.lastMaintenanceAt(),
                "TELEMETRY",
                fix.latitude(),
                fix.longitude(),
                pin.activeMission());
    }

    static UavPin pin(Uav u, Mission mission) {
        Station station = u.getStation();
        boolean deployed = u.getStatus() == UavStatus.ASSIGNED || u.getStatus() == UavStatus.IN_USE;
        String source = "NONE";
        Double lat = null, lng = null;
        if (deployed
                && mission != null
                && mission.getLatitude() != null
                && mission.getLongitude() != null) {
            source = "MISSION";
            lat = mission.getLatitude().doubleValue();
            lng = mission.getLongitude().doubleValue();
        } else if (station != null
                && station.getLatitude() != null
                && station.getLongitude() != null) {
            source = "STATION";
            lat = station.getLatitude();
            lng = station.getLongitude();
        }
        ActiveMission activeMission =
                mission == null
                        ? null
                        : new ActiveMission(
                                mission.getId(),
                                mission.getCode(),
                                mission.getTitle(),
                                mission.getStatus().name(),
                                mission.getLocationName(),
                                mission.getStartTime());
        return new UavPin(
                u.getId(),
                u.getModel(),
                u.getSerialNumber(),
                u.getManufacturer(),
                u.getStatus().name(),
                station == null ? null : station.getId(),
                station == null ? null : station.getName(),
                u.getLastMaintenanceAt(),
                source,
                lat,
                lng,
                activeMission);
    }
}
