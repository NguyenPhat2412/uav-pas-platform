package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.AiTask;

import java.util.List;

public interface IAiTaskDao extends IGenericDao<Long, AiTask> {
    List<AiTask> findByMissionIdOrderByCreatedAtDesc(Long missionId);

    java.util.Optional<AiTask> findByIdForUpdate(Long id);
}
