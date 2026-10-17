package com.uav.platform.modules.mission.repository;

import com.uav.platform.modules.mission.entity.MissionEquipmentReservation;
import com.uav.platform.modules.mission.enums.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface MissionEquipmentReservationRepository
        extends JpaRepository<MissionEquipmentReservation, Long>,
                JpaSpecificationExecutor<MissionEquipmentReservation> {
    List<MissionEquipmentReservation> findByMissionIdAndReleasedFalse(Long missionId);

    List<MissionEquipmentReservation> findByMissionIdOrderByIdAsc(Long missionId);

    @org.springframework.data.jpa.repository.Query(
            "select coalesce(sum(r.quantity), 0) from MissionEquipmentReservation r where r.equipment.id = :id and r.released = false")
    long activeQuantity(@org.springframework.data.repository.query.Param("id") Long id);

    boolean existsByMissionIdAndReleasedFalse(Long missionId);
}
