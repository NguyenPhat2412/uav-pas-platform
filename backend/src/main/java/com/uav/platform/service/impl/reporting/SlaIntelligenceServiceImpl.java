package com.uav.platform.service.impl.reporting;

import com.uav.platform.dto.response.reporting.SlaIntelligenceResponse;
import com.uav.platform.dto.response.reporting.SlaIntelligenceResponse.CustomerReviewRow;
import com.uav.platform.dto.response.reporting.SlaIntelligenceResponse.OperatorSlaRow;
import com.uav.platform.dto.response.reporting.SlaIntelligenceResponse.UavMaintenanceRiskRow;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.mission.MissionEvent;
import com.uav.platform.entity.mission.MissionPreflightLog;
import com.uav.platform.entity.mission.MissionReview;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.entity.uav.UavTelemetry;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.maintenance.RepairStatus;
import com.uav.platform.enums.mission.MissionEventType;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.maintenance.RepairOrderRepository;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.repository.mission.MissionPreflightLogRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.mission.MissionReviewRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.repository.uav.UavTelemetryRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.permission.PermissionService;
import com.uav.platform.service.reporting.SlaIntelligenceService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SlaIntelligenceServiceImpl implements SlaIntelligenceService {

    private static final Set<RepairStatus> ACTIVE_REPAIR_STATUSES =
            Set.of(RepairStatus.OPEN, RepairStatus.IN_PROGRESS);

    private final MissionRepository missionRepository;
    private final MissionEventRepository eventRepository;
    private final MissionReviewRepository reviewRepository;
    private final MissionPreflightLogRepository preflightRepository;
    private final UavRepository uavRepository;
    private final UavTelemetryRepository telemetryRepository;
    private final RepairOrderRepository repairOrderRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    @Override
    public SlaIntelligenceResponse getIntelligence(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            throw SystemException.unauthorized("Vui lòng đăng nhập để tiếp tục.");
        }
        if (permissionService == null
                || (!permissionService.has(authentication, "MISSION_VIEW_ALL")
                        && !permissionService.has(authentication, "USER_MANAGE"))) {
            throw new AccessDeniedException(
                    "SLA intelligence requires MISSION_VIEW_ALL or USER_MANAGE permission");
        }

        List<Mission> allMissions =
                Objects.requireNonNullElse(
                        missionRepository.findAllNonDraftWithAssociations(), List.of());
        List<MissionEvent> allEvents =
                Objects.requireNonNullElse(
                        eventRepository.findConfirmationTimelineEvents(), List.of());
        List<MissionReview> allReviews =
                Objects.requireNonNullElse(
                        reviewRepository.findAllWithMissionAndCustomer(), List.of());
        List<MissionPreflightLog> allPreflights =
                Objects.requireNonNullElse(preflightRepository.findAllWithMission(), List.of());
        List<Uav> allUavs =
                Objects.requireNonNullElse(uavRepository.findAllWithStation(), List.of());
        List<AppUser> allUsers =
                Objects.requireNonNullElse(
                        userRepository.findByRole(UserRole.ROLE_OPERATOR), List.of());

        Map<Long, LocalDateTime> submittedAtByMission = new HashMap<>();
        Map<Long, LocalDateTime> confirmedAtByMission = new HashMap<>();
        for (MissionEvent ev : allEvents) {
            if (ev.getMission() == null || ev.getCreatedAt() == null) continue;
            Long mid = ev.getMission().getId();
            if (ev.getEventType() == MissionEventType.SUBMITTED
                    || ev.getNewStatus() == MissionStatus.PENDING_CONFIRMATION) {
                submittedAtByMission.merge(mid, ev.getCreatedAt(), (a, b) -> a.isBefore(b) ? a : b);
            }
            if (ev.getNewStatus() == MissionStatus.CONFIRMED) {
                confirmedAtByMission.merge(mid, ev.getCreatedAt(), (a, b) -> a.isBefore(b) ? a : b);
            }
        }

        double totalConfirmMinutes = 0.0;
        long confirmedSamples = 0;
        for (Map.Entry<Long, LocalDateTime> entry : confirmedAtByMission.entrySet()) {
            LocalDateTime submittedAt = submittedAtByMission.get(entry.getKey());
            if (submittedAt != null && !entry.getValue().isBefore(submittedAt)) {
                totalConfirmMinutes += Duration.between(submittedAt, entry.getValue()).toMinutes();
                confirmedSamples++;
            }
        }
        double avgConfirmMinutes =
                confirmedSamples > 0 ? round1(totalConfirmMinutes / confirmedSamples) : 0.0;

        Map<Long, MissionPreflightLog> preflightByMission = new HashMap<>();
        for (MissionPreflightLog p : allPreflights) {
            if (p.getMission() != null) {
                preflightByMission.put(p.getMission().getId(), p);
            }
        }

        Map<Long, MissionReview> reviewByMission = new HashMap<>();
        for (MissionReview r : allReviews) {
            if (r.getMission() != null) {
                reviewByMission.put(r.getMission().getId(), r);
            }
        }

        long evaluatedMissions =
                allMissions.stream().filter(m -> m.getStatus() != MissionStatus.DRAFT).count();
        long completedMissions = 0;
        long onTimeCompleted = 0;
        long flownMissions = 0;
        long preflightCompliant = 0;

        for (Mission m : allMissions) {
            if (m.getStatus() == MissionStatus.COMPLETED) {
                completedMissions++;
                if (m.getCompletedAt() == null
                        || m.getExpectedEndTime() == null
                        || !m.getCompletedAt().isAfter(m.getExpectedEndTime().plusMinutes(15))) {
                    onTimeCompleted++;
                }
            }
            if (m.getStatus() == MissionStatus.COMPLETED
                    || m.getStatus() == MissionStatus.IN_PROGRESS) {
                flownMissions++;
                MissionPreflightLog p = preflightByMission.get(m.getId());
                if (p != null && p.isClearedForTakeoff()) {
                    preflightCompliant++;
                }
            }
        }

        double onTimeRate =
                completedMissions > 0
                        ? round1((onTimeCompleted * 100.0) / completedMissions)
                        : 100.0;
        double preflightComplianceRate =
                flownMissions > 0 ? round1((preflightCompliant * 100.0) / flownMissions) : 100.0;

        long totalReviews = allReviews.size();
        long acceptedCount =
                allReviews.stream().filter(MissionReview::isDeliverablesAccepted).count();
        Double avgCustomerRating =
                totalReviews > 0
                        ? round1(
                                allReviews.stream()
                                        .map(MissionReview::getOverallRating)
                                        .filter(Objects::nonNull)
                                        .mapToInt(Integer::intValue)
                                        .average()
                                        .orElse(0.0))
                        : null;

        // Operator SLA Leaderboard
        List<OperatorSlaRow> leaderboard = new ArrayList<>();
        for (AppUser user : allUsers) {
            if (user.getRole() != UserRole.ROLE_OPERATOR) continue;
            long opCompleted = 0;
            long opOnTime = 0;
            long opFlown = 0;
            long opPreflightOk = 0;
            double opHours = 0.0;
            long opRatingSum = 0;
            long opReviewCount = 0;

            for (Mission m : allMissions) {
                if (m.getOperator() == null
                        || !Objects.equals(m.getOperator().getId(), user.getId())) {
                    continue;
                }
                if (m.getStatus() == MissionStatus.COMPLETED) {
                    opCompleted++;
                    opHours += durationHours(m);
                    if (m.getCompletedAt() == null
                            || m.getExpectedEndTime() == null
                            || !m.getCompletedAt()
                                    .isAfter(m.getExpectedEndTime().plusMinutes(15))) {
                        opOnTime++;
                    }
                    MissionReview r = reviewByMission.get(m.getId());
                    if (r != null && r.getOverallRating() != null) {
                        opRatingSum += r.getOverallRating();
                        opReviewCount++;
                    }
                }
                if (m.getStatus() == MissionStatus.COMPLETED
                        || m.getStatus() == MissionStatus.IN_PROGRESS) {
                    opFlown++;
                    MissionPreflightLog p = preflightByMission.get(m.getId());
                    if (p != null && p.isClearedForTakeoff()) {
                        opPreflightOk++;
                    }
                }
            }
            leaderboard.add(
                    new OperatorSlaRow(
                            user.getId(),
                            user.getUsername(),
                            displayName(user),
                            opCompleted,
                            round1(opHours),
                            opCompleted > 0 ? round1((opOnTime * 100.0) / opCompleted) : 100.0,
                            opFlown > 0 ? round1((opPreflightOk * 100.0) / opFlown) : 100.0,
                            opReviewCount > 0
                                    ? round1((double) opRatingSum / (double) opReviewCount)
                                    : null,
                            opReviewCount));
        }
        leaderboard.sort(
                Comparator.comparingLong(OperatorSlaRow::completedMissions)
                        .reversed()
                        .thenComparing(
                                r -> r.avgRating() == null ? 0.0 : r.avgRating(),
                                Comparator.reverseOrder()));

        // Predictive Fleet Maintenance Risk Matrix
        LocalDateTime now = LocalDateTime.now();
        Map<Long, Integer> latestBatteryByUav = new HashMap<>();
        List<UavTelemetry> latestTelemetry = telemetryRepository.latestPerUav();
        if (latestTelemetry != null) {
            for (UavTelemetry t : latestTelemetry) {
                if (t != null && t.getUavId() != null) {
                    latestBatteryByUav.putIfAbsent(t.getUavId(), t.getBatteryPct());
                }
            }
        }
        Set<Long> openRepairUavIds =
                Objects.requireNonNullElse(
                        repairOrderRepository.findUavIdsWithStatusIn(ACTIVE_REPAIR_STATUSES),
                        Set.of());

        List<UavMaintenanceRiskRow> riskRows = new ArrayList<>();
        long dueSoonCount = 0;
        long overdueCount = 0;

        for (Uav uav : allUavs) {
            LocalDateTime lastMaint = uav.getLastMaintenanceAt();
            Long daysSince =
                    lastMaint == null
                            ? null
                            : Math.max(0L, Duration.between(lastMaint, now).toDays());
            long missionsSince = 0;
            double hoursSince = 0.0;
            for (Mission m : allMissions) {
                if (m.getUav() == null || !Objects.equals(m.getUav().getId(), uav.getId())) {
                    continue;
                }
                if (m.getStatus() != MissionStatus.COMPLETED
                        && m.getStatus() != MissionStatus.IN_PROGRESS) {
                    continue;
                }
                LocalDateTime refTime =
                        m.getCompletedAt() != null ? m.getCompletedAt() : m.getStartTime();
                if (lastMaint == null || (refTime != null && refTime.isAfter(lastMaint))) {
                    missionsSince++;
                    hoursSince += durationHours(m);
                }
            }

            Integer latestBattery = latestBatteryByUav.get(uav.getId());
            boolean hasOpenOrder = openRepairUavIds.contains(uav.getId());

            int riskScore = 0;
            if (daysSince == null) {
                riskScore += 45;
            } else if (daysSince > 90) {
                riskScore += 55;
            } else if (daysSince > 45) {
                riskScore += 32;
            } else {
                riskScore += (int) Math.min(20L, daysSince / 3L);
            }
            riskScore += (int) Math.min(35L, Math.round(hoursSince * 2.0));
            if (latestBattery != null && latestBattery < 35) {
                riskScore += 15;
            }
            riskScore = Math.min(100, riskScore);

            String riskLevel;
            String recommendation;
            if (riskScore >= 70 || (daysSince != null && daysSince > 90) || hoursSince >= 25.0) {
                riskLevel = "OVERDUE";
                overdueCount++;
                recommendation =
                        hasOpenOrder
                                ? "Đang có lệnh bảo trì mở — ưu tiên hoàn tất kiểm định khung động cơ và pin."
                                : "Quá ngưỡng chu kỳ vận hành — khuyến nghị tạo lệnh bảo trì phòng ngừa ngay.";
            } else if (riskScore >= 45
                    || daysSince == null
                    || daysSince > 45
                    || hoursSince >= 12.0) {
                riskLevel = "DUE_SOON";
                dueSoonCount++;
                recommendation =
                        hasOpenOrder
                                ? "Đã lên lịch kiểm tra kỹ thuật định kỳ."
                                : "Sắp đến ngưỡng bảo dưỡng định kỳ (khung cánh, cảm biến IMU và chu kỳ pin).";
            } else {
                riskLevel = "NORMAL";
                recommendation = "Trạng thái kỹ thuật ổn định, sẵn sàng khai thác bay.";
            }

            riskRows.add(
                    new UavMaintenanceRiskRow(
                            uav.getId(),
                            uav.getSerialNumber(),
                            uav.getModel(),
                            uav.getStatus().name(),
                            uav.getStation() == null ? null : uav.getStation().getName(),
                            lastMaint,
                            daysSince,
                            missionsSince,
                            round1(hoursSince),
                            latestBattery,
                            hasOpenOrder,
                            riskLevel,
                            riskScore,
                            recommendation));
        }
        riskRows.sort(Comparator.comparingInt(UavMaintenanceRiskRow::riskScore).reversed());

        // Recent customer reviews
        List<CustomerReviewRow> recentReviews =
                reviewRepository.findTop20ByOrderByUpdatedAtDescIdDesc().stream()
                        .map(
                                r -> {
                                    Mission m = r.getMission();
                                    AppUser c = r.getCustomer();
                                    AppUser op = m == null ? null : m.getOperator();
                                    int overall =
                                            r.getOverallRating() == null ? 0 : r.getOverallRating();
                                    return new CustomerReviewRow(
                                            r.getId(),
                                            m == null ? null : m.getId(),
                                            m == null ? null : m.getCode(),
                                            m == null ? null : m.getTitle(),
                                            displayName(c),
                                            op == null ? null : displayName(op),
                                            overall,
                                            r.getDataQualityRating() == null
                                                    ? overall
                                                    : r.getDataQualityRating(),
                                            r.getTimelinessRating() == null
                                                    ? overall
                                                    : r.getTimelinessRating(),
                                            r.isDeliverablesAccepted(),
                                            r.getComment(),
                                            r.getUpdatedAt());
                                })
                        .toList();

        return new SlaIntelligenceResponse(
                evaluatedMissions,
                completedMissions,
                avgConfirmMinutes,
                onTimeRate,
                preflightComplianceRate,
                avgCustomerRating,
                acceptedCount,
                totalReviews,
                dueSoonCount,
                overdueCount,
                List.copyOf(leaderboard),
                List.copyOf(riskRows),
                recentReviews);
    }

    private static double durationHours(Mission m) {
        if (m.getStartTime() == null) return 0.5;
        long plannedMinutes =
                m.getExpectedEndTime() != null && m.getExpectedEndTime().isAfter(m.getStartTime())
                        ? Duration.between(m.getStartTime(), m.getExpectedEndTime()).toMinutes()
                        : 60L;
        long effectiveMinutes = plannedMinutes;
        if (m.getCompletedAt() != null && m.getCompletedAt().isAfter(m.getStartTime())) {
            long actualMinutes = Duration.between(m.getStartTime(), m.getCompletedAt()).toMinutes();
            if (actualMinutes <= Math.max(plannedMinutes * 2L, 240L)) {
                effectiveMinutes = actualMinutes;
            }
        }
        return Math.max(0.5, effectiveMinutes / 60.0);
    }

    private static String displayName(AppUser user) {
        if (user == null) return null;
        return user.getFullName() == null || user.getFullName().isBlank()
                ? user.getUsername()
                : user.getFullName();
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
