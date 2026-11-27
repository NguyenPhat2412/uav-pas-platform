package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.AiDetection;

import java.util.List;

public interface IAiDetectionDao extends IGenericDao<Long, AiDetection> {
    List<AiDetection> findByMissionIdOrderByCreatedAtDesc(Long missionId);

    List<AiDetection> findByAiTaskId(Long aiTaskId);
}
