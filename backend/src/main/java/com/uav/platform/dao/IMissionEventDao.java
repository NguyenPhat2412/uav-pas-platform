package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.MissionEvent;
import com.uav.platform.enums.*;

import java.util.List;

public interface IMissionEventDao extends IGenericDao<Long, MissionEvent> {
    List<MissionEvent> findByMissionIdOrderByCreatedAtAsc(Long missionId);

    List<MissionEvent> findConfirmationTimelineEvents();
}
