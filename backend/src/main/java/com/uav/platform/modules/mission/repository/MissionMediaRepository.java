package com.uav.platform.modules.mission.repository;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.entity.MissionMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface MissionMediaRepository extends JpaRepository<MissionMedia, Long>, JpaSpecificationExecutor<MissionMedia> {
    boolean existsByMediaId(Long mediaId);
    List<MissionMedia> findByMissionIdOrderByCreatedAtAsc(Long missionId);
    boolean existsByMissionIdAndMediaId(Long missionId, Long mediaId);
    boolean existsByMissionIdAndMediaRoleInAndMediaConfirmedTrueAndMediaDeletedFalse(
            Long missionId, java.util.Collection<com.uav.platform.modules.mission.common.MediaRole> roles);
}
