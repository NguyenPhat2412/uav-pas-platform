package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.MissionMedia;
import com.uav.platform.enums.*;

import java.util.List;

public interface IMissionMediaDao extends IGenericDao<Long, MissionMedia> {
    boolean existsByMediaId(Long mediaId);

    List<MissionMedia> findByMissionIdOrderByCreatedAtAsc(Long missionId);

    boolean existsByMissionIdAndMediaId(Long missionId, Long mediaId);

    boolean existsByMissionIdAndMediaRoleInAndMediaConfirmedTrueAndMediaDeletedFalse(
            Long missionId, java.util.Collection<com.uav.platform.enums.MediaRole> roles);
}
