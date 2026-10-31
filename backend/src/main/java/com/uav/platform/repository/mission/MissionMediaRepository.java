package com.uav.platform.repository.mission;

import com.uav.platform.entity.mission.MissionMedia;
import com.uav.platform.enums.mission.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface MissionMediaRepository
        extends JpaRepository<MissionMedia, Long>, JpaSpecificationExecutor<MissionMedia> {
    boolean existsByMediaId(Long mediaId);

    List<MissionMedia> findByMissionIdOrderByCreatedAtAsc(Long missionId);

    boolean existsByMissionIdAndMediaId(Long missionId, Long mediaId);

    boolean existsByMissionIdAndMediaRoleInAndMediaConfirmedTrueAndMediaDeletedFalse(
            Long missionId, java.util.Collection<com.uav.platform.enums.mission.MediaRole> roles);
}
