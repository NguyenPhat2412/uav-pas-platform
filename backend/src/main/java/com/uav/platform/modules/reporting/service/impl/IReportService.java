package com.uav.platform.modules.reporting.service.impl;

import com.uav.platform.modules.mission.common.MissionStatus;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.reporting.config.response.OperationsReportResponse;
import com.uav.platform.modules.reporting.service.ReportService;
import com.uav.platform.modules.sar.repository.AiDetectionRepository;
import com.uav.platform.modules.sar.repository.SarMissionRepository;
import com.uav.platform.modules.station.repository.StationRepository;
import com.uav.platform.modules.uav.common.UavStatus;
import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.repository.UavRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class IReportService implements ReportService {

    private final MissionRepository missionRepository;
    private final UavRepository uavRepository;
    private final StationRepository stationRepository;
    private final SarMissionRepository sarMissionRepository;
    private final AiDetectionRepository aiDetectionRepository;

    public IReportService(MissionRepository missionRepository,
                          UavRepository uavRepository,
                          StationRepository stationRepository,
                          SarMissionRepository sarMissionRepository,
                          AiDetectionRepository aiDetectionRepository) {
        this.missionRepository = missionRepository;
        this.uavRepository = uavRepository;
        this.stationRepository = stationRepository;
        this.sarMissionRepository = sarMissionRepository;
        this.aiDetectionRepository = aiDetectionRepository;
    }

    @Override
    public OperationsReportResponse getOperationsSummary(Authentication auth) {
        List<Mission> missions = missionRepository.findAll();
        long totalMissions = missions.size();
        long completedMissions = missions.stream().filter(m -> m.getStatus() == MissionStatus.COMPLETED).count();
        long failedMissions = missions.stream().filter(m -> m.getStatus() == MissionStatus.FAILED).count();

        double totalHours = missions.stream()
            .filter(m -> m.getStartTime() != null && m.getExpectedEndTime() != null)
            .mapToDouble(m -> Math.max(0.5, Duration.between(m.getStartTime(), m.getExpectedEndTime()).toMinutes() / 60.0))
            .sum();

        List<Uav> uavs = uavRepository.findAll();
        long activeUavCount = uavs.stream().filter(u -> u.getStatus() == UavStatus.AVAILABLE || u.getStatus() == UavStatus.IN_USE || u.getStatus() == UavStatus.ASSIGNED).count();
        long maintenanceUavCount = uavs.stream().filter(u -> u.getStatus() == UavStatus.MAINTENANCE).count();
        long totalStationsCount = stationRepository.count();

        long sarOperationsCount = sarMissionRepository.count();
        long victimsRescued = aiDetectionRepository.findAll().stream()
            .filter(d -> Boolean.TRUE.equals(d.getVerified()) && d.getLabel().toLowerCase().contains("person"))
            .count();

        double successRate = totalMissions > 0 
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
            Math.round(successRate * 10.0) / 10.0
        );
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
        sb.append("Tổng giờ bay tích lũy,").append(summary.totalFlightHours()).append(",giờ\n");
        sb.append("Tỷ lệ thành công,").append(summary.missionSuccessRate()).append(",%\n");
        sb.append("Đội UAV hoạt động,").append(summary.activeUavCount()).append(",chiếc\n");
        sb.append("UAV đang bảo trì,").append(summary.maintenanceUavCount()).append(",chiếc\n");
        sb.append("Tổng số trạm điều hành,").append(summary.totalStationsCount()).append(",trạm\n");
        sb.append("Nhiệm vụ cứu nạn SAR,").append(summary.sarOperationsCount()).append(",đợt\n");
        sb.append("Mục tiêu người cứu hộ thành công,").append(summary.victimsRescuedCount()).append(",người\n");
        return sb.toString();
    }
}
