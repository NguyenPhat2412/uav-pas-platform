package com.uav.platform.modules.inventory.repository;

import com.uav.platform.modules.inventory.entity.Equipment;
import com.uav.platform.modules.inventory.enums.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface EquipmentRepository
        extends JpaRepository<Equipment, Long>, JpaSpecificationExecutor<Equipment> {
    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from Equipment e where e.id = :id")
    java.util.Optional<Equipment> findByIdForUpdate(Long id);

    boolean existsBySerialNumber(String serialNumber);
}
