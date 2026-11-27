package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.MaintenanceSchedule;

import java.util.Optional;

public interface IMaintenanceScheduleDao extends IGenericDao<Long, MaintenanceSchedule> {
    Optional<Long> findUavId(Long id);

    Optional<MaintenanceSchedule> findForUpdate(Long id);
}
