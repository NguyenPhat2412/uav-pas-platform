package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.RepairOrder;
import com.uav.platform.enums.RepairStatus;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface IRepairOrderDao extends IGenericDao<Long, RepairOrder> {
    List<RepairOrder> findAllWithUav();

    Optional<Long> findUavId(Long id);

    Optional<RepairOrder> findForUpdate(Long id);

    boolean existsByUavIdAndStatusIn(Long uavId, Collection<RepairStatus> statuses);

    Set<Long> findUavIdsWithStatusIn(Collection<RepairStatus> statuses);

    boolean existsByUavIdAndStatus(Long uavId, RepairStatus status);

    boolean existsByScheduleIdAndStatusIn(Long scheduleId, Collection<RepairStatus> statuses);
}
