package com.uav.platform.modules.uav.repository;

import com.uav.platform.modules.uav.entity.Uav;
import com.uav.platform.modules.uav.enums.*;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface UavRepository extends JpaRepository<Uav, Long>, JpaSpecificationExecutor<Uav> {
    boolean existsBySerialNumber(String serialNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from Uav u where u.id = :id")
    Optional<Uav> findByIdForUpdate(Long id);
}
