package com.uav.platform.dao.sar;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.sar.SarMission;

import java.util.Optional;

public interface ISarMissionDao extends IGenericDao<Long, SarMission> {
    Optional<SarMission> findByMissionId(Long missionId);
}
