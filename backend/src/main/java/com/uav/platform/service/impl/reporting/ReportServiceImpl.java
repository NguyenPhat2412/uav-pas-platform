package com.uav.platform.service.impl.reporting;

import com.uav.platform.dto.response.reporting.OperationsReportResponse;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.uav.UavStatus;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.sar.AiDetectionRepository;
import com.uav.platform.repository.sar.SarMissionRepository;
import com.uav.platform.repository.station.StationRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.service.reporting.ReportService;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ReportServiceImpl implements ReportService {

    private final MissionRepository missionRepository;
    private final UavRepository uavRepository;
    private final StationRepository stationRepository;
    private final SarMissionRepository sarMissionRepository;
    private final AiDetectionRepository aiDetectionRepository;
    private final com.uav.platform.service.permission.PermissionService permissionService;

    public ReportServiceImpl(
            MissionRepository missionRepository,
            UavRepository uavRepository,
            StationRepository stationRepository,
            SarMissionRepository sarMissionRepository,
            AiDetectionRepository aiDetectionRepository) {
        this(
                missionRepository,
                uavRepository,
                stationRepository,
                sarMissionRepository,
                aiDetectionRepository,
                null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public ReportServiceImpl(
            MissionRepository missionRepository,
            UavRepository uavRepository,
            StationRepository stationRepository,
            SarMissionRepository sarMissionRepository,
            AiDetectionRepository aiDetectionRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false)
                    com.uav.platform.service.permission.PermissionService permissionService) {
        this.missionRepository = missionRepository;
        this.uavRepository = uavRepository;
        this.stationRepository = stationRepository;
        this.sarMissionRepository = sarMissionRepository;
        this.aiDetectionRepository = aiDetectionRepository;
        this.permissionService = permissionService;
    }

    @Override
    public OperationsReportResponse getOperationsSummary(Authentication auth) {
        if (auth == null
                || !auth.isAuthenticated()
                || auth
                        instanceof
                        org.springframework.security.authentication.AnonymousAuthenticationToken) {
            throw com.uav.platform.error.SystemException.unauthorized("Authentication required");
        }
        boolean viewAll =
                permissionService != null
                        && (permissionService.has(auth, "MISSION_VIEW_ALL")
                                || permissionService.has(auth, "USER_MANAGE"));
        String actor = auth != null ? auth.getName() : null;

        List<Mission> missions =
                missionRepository.findAll().stream()
                        .filter(
                                m ->
                                        viewAll
                                                || (m.getCustomer() != null
                                                        && java.util.Objects.equals(
                                                                m.getCustomer().getUsername(),
                                                                actor))
                                                || (m.getOperator() != null
                                                        && java.util.Objects.equals(
                                                                m.getOperator().getUsername(),
                                                                actor)))
                        .toList();
        java.util.Set<Long> visibleMissionIds =
                missions.stream()
                        .map(Mission::getId)
                        .filter(java.util.Objects::nonNull)
                        .collect(java.util.stream.Collectors.toSet());

        long totalMissions = missions.size();
        long completedMissions =
                missions.stream().filter(m -> m.getStatus() == MissionStatus.COMPLETED).count();
        long failedMissions =
                missions.stream().filter(m -> m.getStatus() == MissionStatus.FAILED).count();

        double totalHours =
                missions.stream()
                        .filter(m -> m.getStartTime() != null && m.getExpectedEndTime() != null)
                        .mapToDouble(
                                m ->
                                        Math.max(
                                                0.5,
                                                Duration.between(
                                                                        m.getStartTime(),
                                                                        m.getExpectedEndTime())
                                                                .toMinutes()
                                                        / 60.0))
                        .sum();

        List<Uav> uavs = uavRepository.findAll();
        long activeUavCount =
                uavs.stream()
                        .filter(
                                u ->
                                        u.getStatus() == UavStatus.AVAILABLE
                                                || u.getStatus() == UavStatus.IN_USE
                                                || u.getStatus() == UavStatus.ASSIGNED)
                        .count();
        long maintenanceUavCount =
                uavs.stream().filter(u -> u.getStatus() == UavStatus.MAINTENANCE).count();
        long totalStationsCount = stationRepository.count();

        long sarOperationsCount =
                viewAll
                        ? sarMissionRepository.count()
                        : sarMissionRepository.findAll().stream()
                                .filter(
                                        s ->
                                                s.getMission() != null
                                                        && visibleMissionIds.contains(
                                                                s.getMission().getId()))
                                .count();
        long victimsRescued =
                aiDetectionRepository.findAll().stream()
                        .filter(
                                d ->
                                        viewAll
                                                || (d.getMission() != null
                                                        && visibleMissionIds.contains(
                                                                d.getMission().getId())))
                        .filter(
                                d ->
                                        Boolean.TRUE.equals(d.getVerified())
                                                && d.getLabel() != null
                                                && d.getLabel().equalsIgnoreCase("person"))
                        .count();

        double successRate =
                totalMissions > 0
                        ? (double) completedMissions / (double) totalMissions * 100.0
                        : 100.0;

        return new OperationsReportResponse(
                totalMissions,
                completedMissions,
                failedMissions,
                Math.round(totalHours * 10.0) / 10.0,
                activeUavCount,
                maintenanceUavCount,
                totalStationsCount,
                sarOperationsCount,
                victimsRescued,
                Math.round(successRate * 10.0) / 10.0);
    }

    @Override
    public String exportOperationsCsv(Authentication auth) {
        OperationsReportResponse summary = getOperationsSummary(auth);
        StringBuilder sb = new StringBuilder();
        sb.append("BÁO CÁO TỔNG KẾT VẬN HÀNH NỀN TẢNG UAV PAS\n");
        sb.append("Chỉ số,Giá trị,Đơn vị\n");
        sb.append("Tổng số nhiệm vụ,").append(summary.totalMissions()).append(",nhiệm vụ\n");
        sb.append("Nhiệm vụ hoàn thành,").append(summary.completedMissions()).append(",nhiệm vụ\n");
        sb.append("Nhiệm vụ thất bại,").append(summary.failedMissions()).append(",nhiệm vụ\n");
        sb.append("Giờ dự kiến theo lịch (mọi trạng thái),")
                .append(summary.totalFlightHours())
                .append(",giờ\n");
        sb.append("Tỷ lệ thành công,").append(summary.missionSuccessRate()).append(",%\n");
        sb.append("Đội UAV hoạt động,").append(summary.activeUavCount()).append(",chiếc\n");
        sb.append("UAV đang bảo trì,").append(summary.maintenanceUavCount()).append(",chiếc\n");
        sb.append("Tổng số trạm điều hành,").append(summary.totalStationsCount()).append(",trạm\n");
        sb.append("Nhiệm vụ cứu nạn SAR,").append(summary.sarOperationsCount()).append(",đợt\n");
        sb.append("Phát hiện người đã xác minh,")
                .append(summary.victimsRescuedCount())
                .append(",phát hiện\n");
        return sb.toString();
    }
}
