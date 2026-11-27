package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.SimulationRunLog;

import java.util.List;

public interface ISimulationRunLogDao extends IGenericDao<Long, SimulationRunLog> {
    List<SimulationRunLog> findTop25ByOrderByStartedAtDesc();

    List<SimulationRunLog> findTop25ByUavIdOrderByStartedAtDesc(Long uavId);

    List<SimulationRunLog> findTop25ByMissionIdOrderByStartedAtDesc(Long missionId);
}
