package com.uav.platform.repository.inventory;

import com.uav.platform.entity.inventory.Equipment;
import com.uav.platform.enums.inventory.*;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EquipmentRepository
        extends JpaRepository<Equipment, Long>, JpaSpecificationExecutor<Equipment> {
    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Equipment e where e.id = :id")
    java.util.Optional<Equipment> findByIdForUpdate(Long id);

    boolean existsBySerialNumber(String serialNumber);

    @EntityGraph(attributePaths = {"station"})
    @Query("select e from Equipment e")
    List<Equipment> findAllWithStation();
}
