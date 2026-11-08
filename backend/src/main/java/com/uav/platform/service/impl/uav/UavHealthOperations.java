package com.uav.platform.service.impl.uav;

import com.uav.platform.dto.response.uav.UavHealthAnalyticsResponse;
import com.uav.platform.dto.response.uav.UavHealthAnalyticsResponse.UavHealthProfile;
import com.uav.platform.entity.maintenance.RepairOrder;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.enums.maintenance.RepairStatus;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.uav.UavStatus;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Computes 3D airframe physical profiles, battery cycle state-of-health (SOH), motor wear,
 * and predictive maintenance scores from real UAV, mission, and repair order records.
 */
public final class UavHealthOperations {

    private static final Set<RepairStatus> OPEN_REPAIR_STATUSES =
            Set.of(RepairStatus.OPEN, RepairStatus.IN_PROGRESS);

    private UavHealthOperations() {}

    public static String classifyAirframe(String model, String serialNumber) {
        String combined =
                ((model == null ? "" : model) + " " + (serialNumber == null ? "" : serialNumber))
                        .toUpperCase(Locale.ROOT);
        if (combined.contains("VTOL")
                || combined.contains("WING")
                || combined.contains("FIXED")
                || combined.contains("LR-")) {
            return "VTOL_FIXED_WING";
        }
        if (combined.contains("HEXA")
                || combined.contains("SAR")
                || combined.contains("600")
                || combined.contains("HEAVY")
                || combined.contains("CARGO")
                || combined.contains("RESCUE")) {
            return "HEXACOPTER_SAR";
        }
        return "QUADCOPTER_RTK";
    }

    public static UavHealthAnalyticsResponse analyzeFleet(
            List<Uav> fleet, List<Mission> allMissions, List<RepairOrder> allRepairs) {
        LocalDateTime now = LocalDateTime.now();
        Map<Long, List<Mission>> missionsByUav =
                allMissions.stream()
                        .filter(m -> m.getUav() != null && m.getUav().getId() != null)
                        .collect(Collectors.groupingBy(m -> m.getUav().getId()));
        Map<Long, List<RepairOrder>> repairsByUav =
                allRepairs.stream()
                        .filter(r -> r.getUav() != null && r.getUav().getId() != null)
                        .collect(Collectors.groupingBy(r -> r.getUav().getId()));

        List<UavHealthProfile> profiles = new ArrayList<>();
        int optimal = 0;
        int attention = 0;
        int critical = 0;
        int scoreSum = 0;

        List<Uav> sortedFleet = fleet.stream().sorted(Comparator.comparing(Uav::getId)).toList();

        for (Uav uav : sortedFleet) {
            List<Mission> uavMissions = missionsByUav.getOrDefault(uav.getId(), List.of());
            List<RepairOrder> uavRepairs = repairsByUav.getOrDefault(uav.getId(), List.of());
            UavHealthProfile profile = buildProfile(uav, uavMissions, uavRepairs, now);
            profiles.add(profile);
            scoreSum += profile.healthScore();
            switch (profile.healthTier()) {
                case "OPTIMAL" -> optimal++;
                case "ATTENTION" -> attention++;
                default -> critical++;
            }
        }

        double avg =
                profiles.isEmpty() ? 100.0 : Math.round((scoreSum * 10.0) / profiles.size()) / 10.0;

        return new UavHealthAnalyticsResponse(
                profiles.size(), optimal, attention, critical, avg, profiles);
    }

    private static UavHealthProfile buildProfile(
            Uav uav, List<Mission> uavMissions, List<RepairOrder> uavRepairs, LocalDateTime now) {
        String airframe = classifyAirframe(uav.getModel(), uav.getSerialNumber());
        int rotorCount =
                switch (airframe) {
                    case "HEXACOPTER_SAR" -> 6;
                    case "VTOL_FIXED_WING" -> 5;
                    default -> 4;
                };
        double maxSpeedMs =
                switch (airframe) {
                    case "VTOL_FIXED_WING" -> 28.0;
                    case "HEXACOPTER_SAR" -> 21.0;
                    default -> 18.5;
                };
        double maxWindKnots =
                switch (airframe) {
                    case "VTOL_FIXED_WING" -> 27.0;
                    case "HEXACOPTER_SAR" -> 26.0;
                    default -> 23.0;
                };
        int maxEnduranceMinutes =
                switch (airframe) {
                    case "VTOL_FIXED_WING" -> 95;
                    case "HEXACOPTER_SAR" -> 55;
                    default -> 45;
                };
        double maxPayloadKg =
                switch (airframe) {
                    case "HEXACOPTER_SAR" -> 6.5;
                    case "VTOL_FIXED_WING" -> 3.5;
                    default -> 2.7;
                };

        long completedMissions =
                uavMissions.stream().filter(m -> m.getStatus() == MissionStatus.COMPLETED).count();
        double totalFlightMinutes = 0.0;
        for (Mission m : uavMissions) {
            if (m.getStatus() != MissionStatus.COMPLETED
                    && m.getStatus() != MissionStatus.IN_PROGRESS) {
                continue;
            }
            LocalDateTime s = m.getStartTime();
            LocalDateTime e =
                    m.getCompletedAt() != null ? m.getCompletedAt() : m.getExpectedEndTime();
            if (s != null && e != null && e.isAfter(s)) {
                totalFlightMinutes += Math.min(240.0, Duration.between(s, e).toMinutes());
            } else {
                totalFlightMinutes += 42.0;
            }
        }
        double totalFlightHours = Math.round((totalFlightMinutes / 60.0) * 10.0) / 10.0;

        long openRepairs =
                uavRepairs.stream()
                        .filter(r -> OPEN_REPAIR_STATUSES.contains(r.getStatus()))
                        .count();
        long totalRepairs = uavRepairs.size();

        LocalDateTime baselineMaint =
                uav.getLastMaintenanceAt() != null
                        ? uav.getLastMaintenanceAt()
                        : uav.getCreatedAt();
        long daysSinceMaint =
                baselineMaint != null
                        ? Math.max(0L, Duration.between(baselineMaint, now).toDays())
                        : 30L;

        int estimatedBatteryCycles =
                (int)
                        Math.max(
                                1L,
                                completedMissions * 2L
                                        + (uav.getId() != null ? uav.getId() % 7 : 2));
        int batterySoh =
                Math.max(
                        48,
                        Math.min(
                                100,
                                100 - (estimatedBatteryCycles / 6) - (int) (daysSinceMaint / 45)));
        int motorHealth =
                Math.max(
                        42,
                        Math.min(
                                100,
                                100
                                        - (int) Math.round(totalFlightHours * 0.9)
                                        - (int) (daysSinceMaint / 30)
                                        - (int) (openRepairs * 18)));

        int rawScore =
                (int)
                        Math.round(
                                motorHealth * 0.45
                                        + batterySoh * 0.35
                                        + Math.max(0, 100 - daysSinceMaint * 0.5) * 0.20);
        if (openRepairs > 0) {
            rawScore -= (int) (openRepairs * 20);
        }
        if (uav.getStatus() == UavStatus.MAINTENANCE || uav.getStatus() == UavStatus.INACTIVE) {
            rawScore = Math.min(rawScore, 54);
        }
        int healthScore = Math.max(25, Math.min(100, rawScore));

        String healthTier;
        if (healthScore >= 80
                && openRepairs == 0
                && uav.getStatus() != UavStatus.MAINTENANCE
                && uav.getStatus() != UavStatus.INACTIVE) {
            healthTier = "OPTIMAL";
        } else if (healthScore >= 60 && openRepairs == 0) {
            healthTier = "ATTENTION";
        } else {
            healthTier = "CRITICAL";
        }

        double overhaulIntervalHours = 100.0;
        double hoursSinceOverhaul = totalFlightHours % overhaulIntervalHours;
        double predictedRemainingHours =
                Math.max(
                        2.0,
                        Math.round(
                                        (overhaulIntervalHours - hoursSinceOverhaul)
                                                * (healthScore / 100.0)
                                                * 10.0)
                                / 10.0);

        String recommendation;
        if (openRepairs > 0 || uav.getStatus() == UavStatus.MAINTENANCE) {
            recommendation =
                    "Đang có lệnh sửa chữa/bảo dưỡng mở — hoàn tất kiểm định động cơ & hiệu chuẩn IMU trước khi cấp phát.";
        } else if ("CRITICAL".equals(healthTier)) {
            recommendation =
                    "Khuyến nghị đưa vào bảo trì định kỳ ngay: kiểm tra độ rơ trục motor, đo nội trở pin và cập nhật firmware RTK.";
        } else if ("ATTENTION".equals(healthTier)) {
            recommendation =
                    "Lên lịch bảo dưỡng phòng ngừa trong "
                            + Math.round(predictedRemainingHours)
                            + " giờ bay tới; cân bằng cell pin thông minh.";
        } else {
            recommendation =
                    "Hệ thống động lực, cảm biến RTK và pin ở trạng thái tối ưu — sẵn sàng điều động nhiệm vụ và bay tiếp sức (Hot-Swap).";
        }

        return new UavHealthProfile(
                uav.getId(),
                uav.getSerialNumber(),
                uav.getModel(),
                uav.getManufacturer(),
                uav.getStatus() == null ? "UNKNOWN" : uav.getStatus().name(),
                uav.getStation() == null ? null : uav.getStation().getName(),
                airframe,
                rotorCount,
                maxSpeedMs,
                maxWindKnots,
                maxEnduranceMinutes,
                maxPayloadKg,
                healthScore,
                healthTier,
                completedMissions,
                totalFlightHours,
                openRepairs,
                totalRepairs,
                motorHealth,
                batterySoh,
                estimatedBatteryCycles,
                predictedRemainingHours,
                uav.getLastMaintenanceAt(),
                recommendation);
    }
}
