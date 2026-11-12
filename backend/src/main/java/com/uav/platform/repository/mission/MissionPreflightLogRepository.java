package com.uav.platform.repository.mission;

import com.uav.platform.entity.mission.MissionPreflightLog;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MissionPreflightLogRepository
        extends JpaRepository<MissionPreflightLog, Long>,
                JpaSpecificationExecutor<MissionPreflightLog> {

    Optional<MissionPreflightLog> findByMissionId(Long missionId);

    List<MissionPreflightLog> findByMissionIdIn(Collection<Long> missionIds);

    @EntityGraph(attributePaths = {"mission"})
    @Query("select p from MissionPreflightLog p")
    List<MissionPreflightLog> findAllWithMission();
}
