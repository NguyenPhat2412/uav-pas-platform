package com.uav.platform.dao.notification;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.notification.UserNotificationPreference;
import com.uav.platform.enums.notification.NotificationModuleCode;

import java.util.List;
import java.util.Optional;

public interface IUserNotificationPreferenceDao
        extends IGenericDao<Long, UserNotificationPreference> {
    List<UserNotificationPreference> findByUserId(Long userId);

    Optional<UserNotificationPreference> findByUserIdAndModuleCode(
            Long userId, NotificationModuleCode moduleCode);
}
