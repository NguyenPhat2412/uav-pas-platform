package com.uav.platform.repository.notification;

import com.uav.platform.entity.notification.UserNotificationPreference;
import com.uav.platform.enums.notification.NotificationModuleCode;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserNotificationPreferenceRepository
        extends JpaRepository<UserNotificationPreference, Long>,
                JpaSpecificationExecutor<UserNotificationPreference> {

    List<UserNotificationPreference> findByUserId(Long userId);

    Optional<UserNotificationPreference> findByUserIdAndModuleCode(
            Long userId, NotificationModuleCode moduleCode);
}
