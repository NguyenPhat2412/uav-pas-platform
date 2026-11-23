package com.uav.platform.dao.storage;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.storage.StorageDriveObject;

import java.util.Optional;

public interface IStorageDriveObjectDao extends IGenericDao<Long, StorageDriveObject> {
    Optional<StorageDriveObject> findByObjectKey(String objectKey);

    boolean existsByObjectKey(String objectKey);

    long countByNodeId(Long nodeId);

    long sumBytesByNodeId(Long nodeId);

    long sumAllBytes();
}
