package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.MissionEquipmentReservation;
import com.uav.platform.enums.*;

import java.util.List;

public interface IMissionEquipmentReservationDao
        extends IGenericDao<Long, MissionEquipmentReservation> {
    List<MissionEquipmentReservation> findByMissionIdAndReleasedFalse(Long missionId);

    List<MissionEquipmentReservation> findByMissionIdOrderByIdAsc(Long missionId);

    long activeQuantity(Long id);

    boolean existsByMissionIdAndReleasedFalse(Long missionId);
}
