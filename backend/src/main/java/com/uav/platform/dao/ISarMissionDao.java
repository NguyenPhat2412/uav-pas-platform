package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.SarMission;

import java.util.Optional;

public interface ISarMissionDao extends IGenericDao<Long, SarMission> {
    Optional<SarMission> findByMissionId(Long missionId);
}
