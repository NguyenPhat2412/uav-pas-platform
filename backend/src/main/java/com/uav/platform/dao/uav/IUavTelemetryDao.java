package com.uav.platform.dao.uav;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.uav.UavTelemetry;

import java.util.List;
import java.util.Optional;

public interface IUavTelemetryDao extends IGenericDao<Long, UavTelemetry> {
    Optional<UavTelemetry> findFirstByUavIdOrderByRecordedAtDesc(Long uavId);

    Optional<UavTelemetry> findFirstByUavIdAndMissionIdOrderByRecordedAtDesc(
            Long uavId, Long missionId);

    List<UavTelemetry> findByMissionIdOrderByRecordedAtAsc(Long missionId);

    List<UavTelemetry> latestPerUav();
}
