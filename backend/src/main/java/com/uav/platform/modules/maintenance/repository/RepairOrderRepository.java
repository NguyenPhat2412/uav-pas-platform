package com.uav.platform.modules.maintenance.repository;

import com.uav.platform.modules.maintenance.entity.RepairOrder;
import com.uav.platform.modules.maintenance.common.RepairStatus;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.Optional;

public interface RepairOrderRepository extends JpaRepository<RepairOrder, Long>, JpaSpecificationExecutor<RepairOrder> {
    @Query("select o.uav.id from RepairOrder o where o.id = :id") Optional<Long> findUavId(@Param("id") Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select o from RepairOrder o where o.id = :id")
    Optional<RepairOrder> findForUpdate(@Param("id") Long id);
    boolean existsByUavIdAndStatusIn(Long uavId, Collection<RepairStatus> statuses);
    boolean existsByUavIdAndStatus(Long uavId, RepairStatus status);
    boolean existsByScheduleIdAndStatusIn(Long scheduleId, Collection<RepairStatus> statuses);
}
