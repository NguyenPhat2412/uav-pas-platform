package com.uav.platform.dao.mission;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.mission.MissionEvent;
import com.uav.platform.enums.mission.*;

import java.util.List;

public interface IMissionEventDao extends IGenericDao<Long, MissionEvent> {
    List<MissionEvent> findByMissionIdOrderByCreatedAtAsc(Long missionId);

    List<MissionEvent> findConfirmationTimelineEvents();
}
