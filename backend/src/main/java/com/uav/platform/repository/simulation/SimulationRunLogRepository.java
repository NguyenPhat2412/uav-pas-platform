package com.uav.platform.repository.simulation;

import com.uav.platform.entity.simulation.SimulationRunLog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface SimulationRunLogRepository
        extends JpaRepository<SimulationRunLog, Long>, JpaSpecificationExecutor<SimulationRunLog> {

    List<SimulationRunLog> findTop25ByOrderByStartedAtDesc();

    List<SimulationRunLog> findTop25ByUavIdOrderByStartedAtDesc(Long uavId);

    List<SimulationRunLog> findTop25ByMissionIdOrderByStartedAtDesc(Long missionId);
}
