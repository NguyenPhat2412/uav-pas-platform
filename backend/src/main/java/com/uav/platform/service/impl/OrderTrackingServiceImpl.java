package com.uav.platform.service.impl;

import com.uav.platform.common.util.OrderStatusGroups;
import com.uav.platform.common.util.VietnamProvinceCoordinates;
import com.uav.platform.dao.IMissionDao;
import com.uav.platform.dao.IMissionReviewDao;
import com.uav.platform.dto.response.OrderSummaryResponse;
import com.uav.platform.dto.response.OrderTrackingResponse;
import com.uav.platform.dto.response.SimulationStateResponse;
import com.uav.platform.entity.AppUser;
import com.uav.platform.entity.Mission;
import com.uav.platform.entity.MissionReview;
import com.uav.platform.enums.MissionStatus;
import com.uav.platform.service.MissionAccessService;
import com.uav.platform.service.OrderTrackingService;
import com.uav.platform.service.SimulationService;
import com.uav.platform.specification.MissionSpecifications;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderTrackingServiceImpl implements OrderTrackingService {

    private final IMissionDao missions;
    private final IMissionReviewDao reviews;
    private final MissionAccessService access;

    @Autowired(required = false)
    private SimulationService simulationService;

    @Override
    public OrderSummaryResponse getCustomerSummary(Authentication auth) {
        AppUser customer = access.user(auth.getName());
        List<Mission> customerMissions =
                missions.findAll(MissionSpecifications.hasCustomer(customer.getId()));
        if (customerMissions.isEmpty()) {
            return new OrderSummaryResponse(0, 0, 0, 0, 0);
        }

        List<Long> completedIds =
                customerMissions.stream()
                        .filter(m -> m.getStatus() == MissionStatus.COMPLETED)
                        .map(Mission::getId)
                        .filter(Objects::nonNull)
                        .toList();
        Set<Long> reviewedIds = new HashSet<>();
        if (!completedIds.isEmpty()) {
            for (MissionReview r : reviews.findByMissionIdIn(completedIds)) {
                if (r.getMission() != null && r.getMission().getId() != null) {
                    reviewedIds.add(r.getMission().getId());
                }
            }
        }

        long pending = 0;
        long scheduled = 0;
        long inFlight = 0;
        long delivered = 0;
        long toReview = 0;

        for (Mission m : customerMissions) {
            MissionStatus status = m.getStatus();
            if (OrderStatusGroups.PENDING_STATUSES.contains(status)) {
                pending++;
            } else if (OrderStatusGroups.SCHEDULED_STATUSES.contains(status)) {
                scheduled++;
            } else if (status == MissionStatus.IN_PROGRESS) {
                inFlight++;
            } else if (status == MissionStatus.COMPLETED) {
                delivered++;
                if (!reviewedIds.contains(m.getId())) {
                    toReview++;
                }
            }
        }
        return new OrderSummaryResponse(pending, scheduled, inFlight, delivered, toReview);
    }

    @Override
    public OrderTrackingResponse getOrderTracking(Long missionId, Authentication auth) {
        Mission mission = access.accessible(missionId, auth);
        boolean isReviewed = reviews.findByMissionId(mission.getId()).isPresent();
        String statusGroup = OrderStatusGroups.fromMission(mission.getStatus(), isReviewed);

        SimulationStateResponse sim = findSimulationState(mission);
        if (sim != null) {
            double progress = computeSimProgress(mission.getStatus(), sim);
            int eta = computeEtaMinutes(mission.getStatus(), sim, progress);
            OrderTrackingResponse.Link link =
                    sim.link() != null
                            ? new OrderTrackingResponse.Link(
                                    sim.link().sent(),
                                    sim.link().delivered(),
                                    sim.link().lost(),
                                    sim.link().lossPct(),
                                    sim.link().averageLatencyMs())
                            : new OrderTrackingResponse.Link(0, 0, 0, 0.0, 0.0);
            return new OrderTrackingResponse(
                    mission.getId(),
                    mission.getCode(),
                    mission.getStatus(),
                    statusGroup,
                    !sim.finished(),
                    progress,
                    new OrderTrackingResponse.Position(
                            sim.latitude(),
                            sim.longitude(),
                            sim.altitudeMeters(),
                            sim.headingDeg(),
                            sim.groundSpeedMs()),
                    sim.batteryPct(),
                    link,
                    eta,
                    sim.waypoints() != null ? sim.waypoints() : List.of(),
                    sim.track() != null ? sim.track() : List.of(),
                    LocalDateTime.now());
        }

        double[] fallback = resolveCoords(mission);
        double progress =
                mission.getStatus() == MissionStatus.COMPLETED
                        ? 100.0
                        : (mission.getStatus() == MissionStatus.IN_PROGRESS ? 35.0 : 0.0);
        double battery = mission.getStatus() == MissionStatus.COMPLETED ? 72.0 : 100.0;
        int eta =
                mission.getStatus() == MissionStatus.COMPLETED
                        ? 0
                        : (mission.getStatus() == MissionStatus.IN_PROGRESS ? 12 : 25);

        return new OrderTrackingResponse(
                mission.getId(),
                mission.getCode(),
                mission.getStatus(),
                statusGroup,
                false,
                progress,
                new OrderTrackingResponse.Position(
                        fallback[0],
                        fallback[1],
                        mission.getStatus() == MissionStatus.IN_PROGRESS ? 50.0 : 0.0,
                        0.0,
                        mission.getStatus() == MissionStatus.IN_PROGRESS ? 8.0 : 0.0),
                battery,
                new OrderTrackingResponse.Link(0, 0, 0, 0.0, 0.0),
                eta,
                List.of(List.of(fallback[0], fallback[1])),
                List.of(List.of(fallback[0], fallback[1])),
                mission.getUpdatedAt() != null ? mission.getUpdatedAt() : LocalDateTime.now());
    }

    private SimulationStateResponse findSimulationState(Mission mission) {
        if (simulationService == null) {
            return null;
        }
        for (SimulationStateResponse state : simulationService.list()) {
            if (Objects.equals(state.missionId(), mission.getId())) {
                return state;
            }
        }
        if (mission.getUav() != null) {
            try {
                return simulationService.state(mission.getUav().getId());
            } catch (RuntimeException ignored) {
                return null;
            }
        }
        return null;
    }

    private static double computeSimProgress(MissionStatus status, SimulationStateResponse sim) {
        if (status == MissionStatus.COMPLETED || sim.finished()) {
            return 100.0;
        }
        if (sim.waypointCount() > 0) {
            double raw = (sim.nextWaypoint() * 100.0) / sim.waypointCount();
            return Math.min(99.0, Math.max(5.0, Math.round(raw * 10.0) / 10.0));
        }
        return Math.min(95.0, Math.round(sim.elapsedSeconds() * 10.0) / 10.0);
    }

    private static int computeEtaMinutes(
            MissionStatus status, SimulationStateResponse sim, double progressPct) {
        if (status == MissionStatus.COMPLETED || sim.finished() || progressPct >= 100.0) {
            return 0;
        }
        double remainingFraction = Math.max(0.05, (100.0 - progressPct) / 100.0);
        if (progressPct > 5.0 && sim.elapsedSeconds() > 5.0) {
            double totalEstSec = sim.elapsedSeconds() / (progressPct / 100.0);
            int remMin = (int) Math.ceil((totalEstSec - sim.elapsedSeconds()) / 60.0);
            return Math.max(1, Math.min(180, remMin));
        }
        return Math.max(1, (int) Math.ceil(15.0 * remainingFraction));
    }

    private static double[] resolveCoords(Mission mission) {
        if (mission.getLatitude() != null && mission.getLongitude() != null) {
            return new double[] {
                mission.getLatitude().doubleValue(), mission.getLongitude().doubleValue()
            };
        }
        return VietnamProvinceCoordinates.resolveForProvince(mission.getLocationName());
    }
}
