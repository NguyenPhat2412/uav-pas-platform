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
}
