package com.uav.platform.repository.mission;

import com.uav.platform.entity.mission.MissionEvent;
import com.uav.platform.enums.mission.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface MissionEventRepository
        extends JpaRepository<MissionEvent, Long>, JpaSpecificationExecutor<MissionEvent> {
    List<MissionEvent> findByMissionIdOrderByCreatedAtAsc(Long missionId);
}
