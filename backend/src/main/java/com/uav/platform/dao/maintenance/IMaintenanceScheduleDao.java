package com.uav.platform.dao.maintenance;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.maintenance.MaintenanceSchedule;

import java.util.Optional;

public interface IMaintenanceScheduleDao extends IGenericDao<Long, MaintenanceSchedule> {
    Optional<Long> findUavId(Long id);

    Optional<MaintenanceSchedule> findForUpdate(Long id);
}
