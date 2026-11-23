package com.uav.platform.dao.sar;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.sar.AiDetection;

import java.util.List;

public interface IAiDetectionDao extends IGenericDao<Long, AiDetection> {
    List<AiDetection> findByMissionIdOrderByCreatedAtDesc(Long missionId);

    List<AiDetection> findByAiTaskId(Long aiTaskId);
}
