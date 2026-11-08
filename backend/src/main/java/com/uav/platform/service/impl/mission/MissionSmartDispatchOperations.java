package com.uav.platform.service.impl.mission;

import com.uav.platform.dto.response.mission.MissionDispatchCandidatesResponse;
import com.uav.platform.dto.response.mission.MissionDispatchCandidatesResponse.EquipmentCandidate;
import com.uav.platform.dto.response.mission.MissionDispatchCandidatesResponse.OperatorCandidate;
import com.uav.platform.dto.response.mission.MissionDispatchCandidatesResponse.StationCandidate;
import com.uav.platform.dto.response.mission.MissionDispatchCandidatesResponse.UavCandidate;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.mission.MissionEquipmentReservation;
import com.uav.platform.entity.station.Station;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.uav.UavTelemetry;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.inventory.EquipmentStatus;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.station.StationStatus;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.service.impl.airspace.AirspaceGeometryOperations;
import com.uav.platform.service.mission.MissionResourceService;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Scores and filters stations, aircraft, operators, and equipment for Smart Dispatch without
 * mutating persistence state.
 */
public final class MissionSmartDispatchOperations {

    private MissionSmartDispatchOperations() {}

    public static Map<Long, Long> parseOperatorCounts(List<Object[]> rows) {
        Map<Long, Long> result = new HashMap<>();
        if (rows == null) {
            return result;
        }
        for (Object[] row : rows) {
            if (row != null
                    && row.length >= 2
                    && row[0] instanceof Number opId
                    && row[1] instanceof Number cnt) {
                result.put(opId.longValue(), cnt.longValue());
            }
        }
        return result;
    }

    public static Map<Long, Double> parseOperatorRatings(List<Object[]> rows) {
        Map<Long, Double> result = new HashMap<>();
        if (rows == null) {
            return result;
        }
        for (Object[] row : rows) {
            if (row != null
                    && row.length >= 2
                    && row[0] instanceof Number opId
                    && row[1] instanceof Number avg) {
                result.put(opId.longValue(), round1(avg.doubleValue()));
            }
        }
        return result;
    }

    public static MissionDispatchCandidatesResponse evaluateCandidates(
            Mission mission,
            List<Station> allStations,
            List<Uav> allUavs,
            List<Equipment> allEquipment,
            List<AppUser> operators,
            List<Mission> activeMissions,
            Map<Long, Long> completedCountByOperator,
            Map<Long, Double> avgRatingByOperator,
            List<MissionEquipmentReservation> activeReservations,
            List<UavTelemetry> latestTelemetry,
            Set<Long> activeRepairUavIds,
            List<MissionStatus> excluded,
            MissionResourceService resources) {
        Map<Long, Station> stationById = new HashMap<>();
        for (Station s : allStations) {
            stationById.put(s.getId(), s);
        }

        Set<Long> boundStationIds = new LinkedHashSet<>();
        if (mission.getStation() != null && mission.getStation().getId() != null) {
            boundStationIds.add(mission.getStation().getId());
        }
        if (mission.getUav() != null
                && mission.getUav().getStation() != null
                && mission.getUav().getStation().getId() != null) {
            boundStationIds.add(mission.getUav().getStation().getId());
        }
        for (MissionEquipmentReservation res : activeReservations) {
            if (res != null
                    && res.getEquipment() != null
                    && res.getEquipment().getStation() != null
                    && res.getEquipment().getStation().getId() != null) {
                boundStationIds.add(res.getEquipment().getStation().getId());
            }
        }
        boolean stationConflict = boundStationIds.size() > 1;
        Long lockedStationId =
                !stationConflict && boundStationIds.size() == 1
                        ? boundStationIds.iterator().next()
                        : null;

        Map<Long, Integer> availableUavsPerStation = new HashMap<>();
        int unstationedUavs = 0;
        for (Uav u : allUavs) {
            Station uStation =
                    u.getStation() == null ? null : stationById.get(u.getStation().getId());
            if (uStation != null && uStation.getStatus() != StationStatus.ACTIVE) {
                continue;
            }
            if (!activeRepairUavIds.contains(u.getId())
                    && isUavAvailableForWindow(u, mission, activeMissions, excluded)) {
                if (u.getStation() == null) {
                    unstationedUavs++;
                } else {
                    availableUavsPerStation.merge(u.getStation().getId(), 1, Integer::sum);
                }
            }
        }

        Map<Long, Integer> availableEquipPerStation = new HashMap<>();
        int unstationedEquip = 0;
        for (Equipment eq : allEquipment) {
            Station eqStation =
                    eq.getStation() == null ? null : stationById.get(eq.getStation().getId());
            if (eqStation != null && eqStation.getStatus() != StationStatus.ACTIVE) {
                continue;
            }
            if (eq.getStatus() == EquipmentStatus.ACTIVE && eq.getAvailableQuantity() > 0) {
                if (eq.getStation() == null) {
                    unstationedEquip++;
                } else {
                    availableEquipPerStation.merge(eq.getStation().getId(), 1, Integer::sum);
                }
            }
        }

        List<StationCandidate> stationCandidates = new ArrayList<>();
        for (Station s : allStations) {
            Double distKm = distanceKm(mission, s);
            int availUavs = availableUavsPerStation.getOrDefault(s.getId(), 0) + unstationedUavs;
            int availEq = availableEquipPerStation.getOrDefault(s.getId(), 0) + unstationedEquip;
            boolean active = s.getStatus() == StationStatus.ACTIVE;
            boolean stationCompatible =
                    !stationConflict
                            && (lockedStationId == null
                                    || Objects.equals(lockedStationId, s.getId()));
            boolean eligible = active && stationCompatible;
            String reason =
                    !active
                            ? "INACTIVE"
                            : (stationConflict
                                    ? "STATION_CONFLICT"
                                    : (!stationCompatible ? "STATION_LOCKED" : "READY"));
            int distScore =
                    distKm == null
                            ? 20
                            : distKm <= 5.0
                                    ? 40
                                    : distKm <= 15.0
                                            ? 32
                                            : distKm <= 35.0 ? 22 : distKm <= 80.0 ? 12 : 5;
            int uavScore = Math.min(30, availUavs * 15);
            int eqScore = Math.min(30, availEq * 15);
            int score = eligible ? Math.min(100, distScore + uavScore + eqScore) : 0;
            stationCandidates.add(
                    new StationCandidate(
                            s.getId(),
                            s.getCode(),
                            s.getName(),
                            distKm == null ? null : round1(distKm),
                            availUavs,
                            availEq,
                            score,
                            eligible,
                            reason));
        }
        stationCandidates.sort(
                Comparator.comparing(StationCandidate::eligible)
                        .reversed()
                        .thenComparing(
                                Comparator.comparingInt(StationCandidate::score).reversed()));

        boolean hasActiveEquipment = !activeReservations.isEmpty();

        Long chosenStationId =
                stationConflict
                        ? null
                        : (mission.getStation() != null
                                ? mission.getStation().getId()
                                : stationCandidates.stream()
                                        .filter(StationCandidate::eligible)
                                        .filter(
                                                sc ->
                                                        (mission.getUav() != null
                                                                        || sc.availableUavCount()
                                                                                > 0)
                                                                && (hasActiveEquipment
                                                                        || sc
                                                                                        .availableEquipmentCount()
                                                                                > 0))
                                        .map(StationCandidate::id)
                                        .findFirst()
                                        .orElseGet(
                                                () ->
                                                        stationCandidates.stream()
                                                                .filter(StationCandidate::eligible)
                                                                .map(StationCandidate::id)
                                                                .findFirst()
                                                                .orElse(null)));

        Map<Long, Integer> latestBatteryByUav = new HashMap<>();
        if (latestTelemetry != null) {
            for (UavTelemetry t : latestTelemetry) {
                if (t != null && t.getUavId() != null) {
                    latestBatteryByUav.putIfAbsent(t.getUavId(), t.getBatteryPct());
                }
            }
        }

        LocalDateTime now = LocalDateTime.now();
        List<UavCandidate> uavCandidates = new ArrayList<>();
        for (Uav u : allUavs) {
            Station uStation =
                    u.getStation() == null ? null : stationById.get(u.getStation().getId());
            Double distKm = uStation != null ? distanceKm(mission, uStation) : null;
            Integer batteryPct = latestBatteryByUav.get(u.getId());
            Long daysSinceMaint =
                    u.getLastMaintenanceAt() == null
                            ? null
                            : Math.max(
                                    0L, Duration.between(u.getLastMaintenanceAt(), now).toDays());

            boolean alreadyOnThisMission =
                    mission.getUav() != null && Objects.equals(mission.getUav().getId(), u.getId());
            String conflict = null;
            if (!alreadyOnThisMission) {
                if (u.getStatus() != UavStatus.AVAILABLE) {
                    conflict = "UAV_STATUS_" + u.getStatus();
                } else if (activeRepairUavIds.contains(u.getId())) {
                    conflict = "OPEN_REPAIR_ORDER";
                } else if (uStation != null && uStation.getStatus() != StationStatus.ACTIVE) {
                    conflict = "STATION_INACTIVE";
                } else if (stationConflict) {
                    conflict = "STATION_CONFLICT";
                } else if (hasOtherActiveMission(
                        u.getId(), mission.getId(), activeMissions, excluded)) {
                    conflict = "UAV_IN_OTHER_MISSION";
                } else if (hasOverlappingUavWindow(u.getId(), mission, activeMissions, excluded)) {
                    conflict = "TIME_CONFLICT";
                } else if (chosenStationId != null
                        && u.getStation() != null
                        && !Objects.equals(chosenStationId, u.getStation().getId())) {
                    conflict = "STATION_MISMATCH";
                }
            }
            boolean eligible = conflict == null;
            int battScore =
                    batteryPct == null
                            ? 20
                            : batteryPct >= 85
                                    ? 30
                                    : batteryPct >= 65 ? 22 : batteryPct >= 40 ? 12 : 4;
            int maintScore =
                    daysSinceMaint == null
                            ? 16
                            : daysSinceMaint <= 30 ? 30 : daysSinceMaint <= 60 ? 22 : 10;
            int proxScore = distKm == null ? 24 : distKm <= 15.0 ? 40 : distKm <= 40.0 ? 28 : 16;
            int score = eligible ? Math.min(100, battScore + maintScore + proxScore) : 0;

            uavCandidates.add(
                    new UavCandidate(
                            u.getId(),
                            u.getSerialNumber(),
                            u.getModel(),
                            u.getStation() == null ? null : u.getStation().getId(),
                            uStation == null ? null : uStation.getName(),
                            distKm == null ? null : round1(distKm),
                            batteryPct,
                            daysSinceMaint,
                            score,
                            eligible,
                            conflict));
        }
        uavCandidates.sort(
                Comparator.comparing(UavCandidate::eligible)
                        .reversed()
                        .thenComparing(Comparator.comparingInt(UavCandidate::score).reversed()));

        List<OperatorCandidate> operatorCandidates = new ArrayList<>();
        for (AppUser op : operators) {
            if (op.getRole() != UserRole.ROLE_OPERATOR) continue;
            boolean alreadyAssigned =
                    mission.getOperator() != null
                            && Objects.equals(mission.getOperator().getId(), op.getId());
            String conflict = null;
            if (!resources.eligibleOperator(op)) {
                conflict = "ACCOUNT_INACTIVE";
            } else if (!alreadyAssigned
                    && hasOverlappingOperatorWindow(
                            op.getId(), mission, activeMissions, excluded)) {
                conflict = "TIME_CONFLICT";
            }
            int sameDayCount = 0;
            for (Mission m : activeMissions) {
                if (m.getOperator() == null
                        || !Objects.equals(m.getOperator().getId(), op.getId())) {
                    continue;
                }
                if (!Objects.equals(m.getId(), mission.getId())
                        && !excluded.contains(m.getStatus())
                        && Objects.equals(m.getRequestedDate(), mission.getRequestedDate())) {
                    sameDayCount++;
                }
            }
            long completedCount = completedCountByOperator.getOrDefault(op.getId(), 0L);
            Double avgRating = avgRatingByOperator.get(op.getId());

            boolean eligible = conflict == null;
            int loadScore = sameDayCount == 0 ? 40 : sameDayCount == 1 ? 28 : 15;
            int expScore = (int) Math.min(30L, completedCount * 6L + 6L);
            int ratingScore = avgRating == null ? 22 : (int) Math.round(avgRating * 6.0);
            int score = eligible ? Math.min(100, loadScore + expScore + ratingScore) : 0;

            operatorCandidates.add(
                    new OperatorCandidate(
                            op.getId(),
                            op.getUsername(),
                            op.getFullName() == null || op.getFullName().isBlank()
                                    ? op.getUsername()
                                    : op.getFullName(),
                            sameDayCount,
                            completedCount,
                            avgRating,
                            score,
                            eligible,
                            conflict));
        }
        operatorCandidates.sort(
                Comparator.comparing(OperatorCandidate::eligible)
                        .reversed()
                        .thenComparing(
                                Comparator.comparingInt(OperatorCandidate::score).reversed()));

        List<EquipmentCandidate> equipmentCandidates = new ArrayList<>();
        for (Equipment eq : allEquipment) {
            Station eqStation =
                    eq.getStation() == null ? null : stationById.get(eq.getStation().getId());
            boolean active = eq.getStatus() == EquipmentStatus.ACTIVE;
            boolean stationActive =
                    eqStation == null || eqStation.getStatus() == StationStatus.ACTIVE;
            boolean inStock = eq.getAvailableQuantity() > 0;
            boolean stationMatch =
                    !stationConflict
                            && (chosenStationId == null
                                    || eq.getStation() == null
                                    || Objects.equals(chosenStationId, eq.getStation().getId()));
            boolean eligible = active && stationActive && inStock && stationMatch;
            String reason =
                    !active
                            ? "INACTIVE"
                            : (!stationActive
                                    ? "STATION_INACTIVE"
                                    : (!inStock
                                            ? "OUT_OF_STOCK"
                                            : (stationConflict
                                                    ? "STATION_CONFLICT"
                                                    : (!stationMatch
                                                            ? "STATION_MISMATCH"
                                                            : "READY"))));
            int stockScore = Math.min(60, eq.getAvailableQuantity() * 15);
            int stationBonus =
                    chosenStationId != null
                                    && eq.getStation() != null
                                    && Objects.equals(chosenStationId, eq.getStation().getId())
                            ? 40
                            : 25;
            int score = eligible ? Math.min(100, stockScore + stationBonus) : 0;
            equipmentCandidates.add(
                    new EquipmentCandidate(
                            eq.getId(),
                            eq.getName(),
                            eq.getType() == null ? "GENERAL" : eq.getType().name(),
                            eq.getStation() == null ? null : eq.getStation().getId(),
                            eq.getAvailableQuantity(),
                            score,
                            eligible,
                            reason));
        }
        equipmentCandidates.sort(
                Comparator.comparing(EquipmentCandidate::eligible)
                        .reversed()
                        .thenComparing(
                                Comparator.comparingInt(EquipmentCandidate::score).reversed()));

        Long recommendedUavId =
                mission.getUav() != null
                        ? mission.getUav().getId()
                        : uavCandidates.stream()
                                .filter(UavCandidate::eligible)
                                .map(UavCandidate::id)
                                .findFirst()
                                .orElse(null);
        Long recommendedOperatorId =
                mission.getOperator() != null
                        ? mission.getOperator().getId()
                        : operatorCandidates.stream()
                                .filter(OperatorCandidate::eligible)
                                .map(OperatorCandidate::id)
                                .findFirst()
                                .orElse(null);
        Long recommendedEquipmentId =
                hasActiveEquipment
                        ? null
                        : equipmentCandidates.stream()
                                .filter(EquipmentCandidate::eligible)
                                .map(EquipmentCandidate::id)
                                .findFirst()
                                .orElse(null);

        boolean statusAllowsDispatch =
                mission.getStatus() == MissionStatus.CONFIRMED
                        || mission.getStatus() == MissionStatus.RESOURCE_RESERVED;
        boolean missingSomething =
                mission.getStation() == null
                        || mission.getUav() == null
                        || mission.getOperator() == null
                        || !hasActiveEquipment;
        boolean allRecommendable =
                !stationConflict
                        && (mission.getStation() != null || chosenStationId != null)
                        && (mission.getUav() != null || recommendedUavId != null)
                        && (mission.getOperator() != null || recommendedOperatorId != null)
                        && (hasActiveEquipment || recommendedEquipmentId != null);

        return new MissionDispatchCandidatesResponse(
                mission.getId(),
                mission.getCode(),
                mission.getStatus(),
                chosenStationId,
                recommendedUavId,
                recommendedOperatorId,
                recommendedEquipmentId,
                statusAllowsDispatch && missingSomething && allRecommendable,
                List.copyOf(stationCandidates),
                List.copyOf(uavCandidates),
                List.copyOf(operatorCandidates),
                List.copyOf(equipmentCandidates));
    }

    private static boolean isUavAvailableForWindow(
            Uav uav, Mission target, List<Mission> activeMissions, List<MissionStatus> excluded) {
        if (uav.getStatus() != UavStatus.AVAILABLE) return false;
        if (hasOtherActiveMission(uav.getId(), target.getId(), activeMissions, excluded)) {
            return false;
        }
        return !hasOverlappingUavWindow(uav.getId(), target, activeMissions, excluded);
    }

    private static boolean hasOtherActiveMission(
            Long uavId,
            Long targetMissionId,
            List<Mission> activeMissions,
            List<MissionStatus> excluded) {
        for (Mission m : activeMissions) {
            if (Objects.equals(m.getId(), targetMissionId)) continue;
            if (m.getUav() != null
                    && Objects.equals(m.getUav().getId(), uavId)
                    && !excluded.contains(m.getStatus())) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasOverlappingUavWindow(
            Long uavId,
            Mission target,
            List<Mission> activeMissions,
            List<MissionStatus> excluded) {
        if (target.getStartTime() == null || target.getExpectedEndTime() == null) return false;
        for (Mission m : activeMissions) {
            if (Objects.equals(m.getId(), target.getId()) || excluded.contains(m.getStatus())) {
                continue;
            }
            if (m.getUav() != null
                    && Objects.equals(m.getUav().getId(), uavId)
                    && m.getStartTime() != null
                    && m.getExpectedEndTime() != null
                    && m.getStartTime().isBefore(target.getExpectedEndTime())
                    && m.getExpectedEndTime().isAfter(target.getStartTime())) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasOverlappingOperatorWindow(
            Long operatorId,
            Mission target,
            List<Mission> activeMissions,
            List<MissionStatus> excluded) {
        if (target.getStartTime() == null || target.getExpectedEndTime() == null) return false;
        for (Mission m : activeMissions) {
            if (Objects.equals(m.getId(), target.getId()) || excluded.contains(m.getStatus())) {
                continue;
            }
            if (m.getOperator() != null
                    && Objects.equals(m.getOperator().getId(), operatorId)
                    && m.getStartTime() != null
                    && m.getExpectedEndTime() != null
                    && m.getStartTime().isBefore(target.getExpectedEndTime())
                    && m.getExpectedEndTime().isAfter(target.getStartTime())) {
                return true;
            }
        }
        return false;
    }

    private static Double distanceKm(Mission mission, Station station) {
        if (mission.getLatitude() == null
                || mission.getLongitude() == null
                || station.getLatitude() == null
                || station.getLongitude() == null) {
            return null;
        }
        double meters =
                AirspaceGeometryOperations.haversineMeters(
                        mission.getLatitude().doubleValue(),
                        mission.getLongitude().doubleValue(),
                        station.getLatitude(),
                        station.getLongitude());
        return meters / 1000.0;
    }

    private static double round1(double val) {
        return Math.round(val * 10.0) / 10.0;
    }
}
