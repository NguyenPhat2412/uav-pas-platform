package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.StorageDriveNode;

import java.util.List;
import java.util.Optional;

public interface IStorageDriveNodeDao extends IGenericDao<Long, StorageDriveNode> {
    Optional<StorageDriveNode> findByCode(String code);

    Optional<StorageDriveNode> findByAccountEmailIgnoreCase(String accountEmail);

    List<StorageDriveNode> findAllByOrderByPriorityWeightDescIdAsc();

    List<StorageDriveNode> findByEnabledTrueOrderByPriorityWeightDescIdAsc();
}
