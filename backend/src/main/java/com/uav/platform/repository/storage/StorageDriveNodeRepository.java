package com.uav.platform.repository.storage;

import com.uav.platform.entity.storage.StorageDriveNode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface StorageDriveNodeRepository
        extends JpaRepository<StorageDriveNode, Long>, JpaSpecificationExecutor<StorageDriveNode> {
    Optional<StorageDriveNode> findByCode(String code);

    Optional<StorageDriveNode> findByAccountEmailIgnoreCase(String accountEmail);

    List<StorageDriveNode> findAllByOrderByPriorityWeightDescIdAsc();

    List<StorageDriveNode> findByEnabledTrueOrderByPriorityWeightDescIdAsc();
}
