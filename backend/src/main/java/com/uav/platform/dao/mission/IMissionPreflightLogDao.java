package com.uav.platform.dao.mission;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.mission.MissionPreflightLog;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface IMissionPreflightLogDao extends IGenericDao<Long, MissionPreflightLog> {
    Optional<MissionPreflightLog> findByMissionId(Long missionId);

    List<MissionPreflightLog> findByMissionIdIn(Collection<Long> missionIds);

    List<MissionPreflightLog> findAllWithMission();
}
