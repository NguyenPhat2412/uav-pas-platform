package com.uav.platform.repository.uav;

import com.uav.platform.entity.uav.Uav;
import com.uav.platform.enums.uav.*;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UavRepository extends JpaRepository<Uav, Long>, JpaSpecificationExecutor<Uav> {
    boolean existsBySerialNumber(String serialNumber);

    @EntityGraph(attributePaths = {"station"})
    @Query("select u from Uav u")
    List<Uav> findAllWithStation();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from Uav u where u.id = :id")
    Optional<Uav> findByIdForUpdate(Long id);
}
