package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.NotificationModulePolicy;
import com.uav.platform.enums.NotificationModuleCode;

import java.util.List;
import java.util.Optional;

public interface INotificationModulePolicyDao extends IGenericDao<Long, NotificationModulePolicy> {
    List<NotificationModulePolicy> findAllByOrderBySortOrderAscIdAsc();

    Optional<NotificationModulePolicy> findByModuleCode(NotificationModuleCode moduleCode);
}
