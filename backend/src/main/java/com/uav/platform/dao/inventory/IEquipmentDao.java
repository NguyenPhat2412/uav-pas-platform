package com.uav.platform.dao.inventory;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.enums.inventory.*;

import java.util.List;

public interface IEquipmentDao extends IGenericDao<Long, Equipment> {
    java.util.Optional<Equipment> findByIdForUpdate(Long id);

    boolean existsBySerialNumber(String serialNumber);

    List<Equipment> findAllWithStation();

    List<Equipment> findByProviderIdOrderByIdDesc(Long providerId);
}
