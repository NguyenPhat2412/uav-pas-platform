package com.uav.platform.modules.mission.repository;

import com.uav.platform.modules.mission.entity.MissionEvent;
import com.uav.platform.modules.mission.enums.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface MissionEventRepository
        extends JpaRepository<MissionEvent, Long>, JpaSpecificationExecutor<MissionEvent> {
    List<MissionEvent> findByMissionIdOrderByCreatedAtAsc(Long missionId);
}
