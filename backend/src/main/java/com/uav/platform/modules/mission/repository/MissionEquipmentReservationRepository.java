package com.uav.platform.modules.mission.repository;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.entity.MissionEquipmentReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface MissionEquipmentReservationRepository extends JpaRepository<MissionEquipmentReservation, Long>, JpaSpecificationExecutor<MissionEquipmentReservation> {
    List<MissionEquipmentReservation> findByMissionIdAndReleasedFalse(Long missionId);
    boolean existsByMissionIdAndReleasedFalse(Long missionId);
}
