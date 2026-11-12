package com.uav.platform.repository.mission;

import com.uav.platform.entity.mission.MissionEvent;
import com.uav.platform.enums.mission.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface MissionEventRepository
        extends JpaRepository<MissionEvent, Long>, JpaSpecificationExecutor<MissionEvent> {
    List<MissionEvent> findByMissionIdOrderByCreatedAtAsc(Long missionId);

    @Query(
            "select e from MissionEvent e join fetch e.mission where e.eventType = com.uav.platform.enums.mission.MissionEventType.SUBMITTED or e.newStatus in (com.uav.platform.enums.mission.MissionStatus.PENDING_CONFIRMATION, com.uav.platform.enums.mission.MissionStatus.CONFIRMED)")
    List<MissionEvent> findConfirmationTimelineEvents();
}
