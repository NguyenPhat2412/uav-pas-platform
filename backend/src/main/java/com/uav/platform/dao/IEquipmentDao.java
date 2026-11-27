package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.Equipment;
import com.uav.platform.enums.*;

import java.util.List;

public interface IEquipmentDao extends IGenericDao<Long, Equipment> {
    java.util.Optional<Equipment> findByIdForUpdate(Long id);

    boolean existsBySerialNumber(String serialNumber);

    List<Equipment> findAllWithStation();

    List<Equipment> findByProviderIdOrderByIdDesc(Long providerId);
}
