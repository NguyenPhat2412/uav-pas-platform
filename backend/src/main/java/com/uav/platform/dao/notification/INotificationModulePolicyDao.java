package com.uav.platform.dao.notification;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.notification.NotificationModulePolicy;
import com.uav.platform.enums.notification.NotificationModuleCode;

import java.util.List;
import java.util.Optional;

public interface INotificationModulePolicyDao extends IGenericDao<Long, NotificationModulePolicy> {
    List<NotificationModulePolicy> findAllByOrderBySortOrderAscIdAsc();

    Optional<NotificationModulePolicy> findByModuleCode(NotificationModuleCode moduleCode);
}
