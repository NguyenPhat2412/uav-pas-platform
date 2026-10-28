package com.uav.platform.modules.sar.repository;

import com.uav.platform.modules.sar.entity.SarMission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SarMissionRepository
        extends JpaRepository<SarMission, Long>, JpaSpecificationExecutor<SarMission> {
    Optional<SarMission> findByMissionId(Long missionId);

    /** Cockpit page: mission, UAV, stations and operator in the same query (no N+1). */
    @Override
    @org.springframework.data.jpa.repository.EntityGraph(
            attributePaths = {
                "mission",
                "mission.uav",
                "mission.uav.station",
                "mission.station",
                "mission.operator"
            })
    org.springframework.data.domain.Page<SarMission> findAll(
            org.springframework.data.jpa.domain.Specification<SarMission> spec,
            org.springframework.data.domain.Pageable pageable);
}
