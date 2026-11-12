package com.uav.platform.repository.maintenance;

import com.uav.platform.entity.maintenance.MaintenanceSchedule;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MaintenanceScheduleRepository
        extends JpaRepository<MaintenanceSchedule, Long>,
                JpaSpecificationExecutor<MaintenanceSchedule> {
    @Query("select s.uav.id from MaintenanceSchedule s where s.id = :id")
    Optional<Long> findUavId(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from MaintenanceSchedule s where s.id = :id")
    Optional<MaintenanceSchedule> findForUpdate(@Param("id") Long id);
}
