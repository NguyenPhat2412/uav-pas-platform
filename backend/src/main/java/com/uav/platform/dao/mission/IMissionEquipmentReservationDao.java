package com.uav.platform.dao.mission;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.mission.MissionEquipmentReservation;
import com.uav.platform.enums.mission.*;

import java.util.List;

public interface IMissionEquipmentReservationDao
        extends IGenericDao<Long, MissionEquipmentReservation> {
    List<MissionEquipmentReservation> findByMissionIdAndReleasedFalse(Long missionId);

    List<MissionEquipmentReservation> findByMissionIdOrderByIdAsc(Long missionId);

    long activeQuantity(Long id);

    boolean existsByMissionIdAndReleasedFalse(Long missionId);
}
