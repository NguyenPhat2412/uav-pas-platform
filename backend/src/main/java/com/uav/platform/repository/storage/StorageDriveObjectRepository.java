package com.uav.platform.repository.storage;

import com.uav.platform.entity.storage.StorageDriveObject;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface StorageDriveObjectRepository
        extends JpaRepository<StorageDriveObject, Long>,
                JpaSpecificationExecutor<StorageDriveObject> {
    Optional<StorageDriveObject> findByObjectKey(String objectKey);

    boolean existsByObjectKey(String objectKey);

    long countByNodeId(Long nodeId);

    @Query(
            "SELECT COALESCE(SUM(o.sizeBytes), 0) FROM StorageDriveObject o WHERE o.node.id = :nodeId")
    long sumBytesByNodeId(Long nodeId);

    @Query("SELECT COALESCE(SUM(o.sizeBytes), 0) FROM StorageDriveObject o")
    long sumAllBytes();
}
