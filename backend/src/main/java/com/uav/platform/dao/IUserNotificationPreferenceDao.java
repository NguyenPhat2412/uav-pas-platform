package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.UserNotificationPreference;
import com.uav.platform.enums.NotificationModuleCode;

import java.util.List;
import java.util.Optional;

public interface IUserNotificationPreferenceDao
        extends IGenericDao<Long, UserNotificationPreference> {
    List<UserNotificationPreference> findByUserId(Long userId);

    Optional<UserNotificationPreference> findByUserIdAndModuleCode(
            Long userId, NotificationModuleCode moduleCode);
}
