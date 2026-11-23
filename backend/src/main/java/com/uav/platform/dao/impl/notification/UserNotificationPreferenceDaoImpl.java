package com.uav.platform.dao.impl.notification;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.notification.IUserNotificationPreferenceDao;
import com.uav.platform.entity.notification.UserNotificationPreference;
import com.uav.platform.enums.notification.NotificationModuleCode;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class UserNotificationPreferenceDaoImpl
        extends HibernateGenericDao<Long, UserNotificationPreference>
        implements IUserNotificationPreferenceDao {

    private static final Logger logger =
            LoggerFactory.getLogger(UserNotificationPreferenceDaoImpl.class);

    public UserNotificationPreferenceDaoImpl(final EntityManager entityManager) {
        super(UserNotificationPreference.class, entityManager);
    }

    @Override
    public List<UserNotificationPreference> findByUserId(Long userId) {
        return hql("select e from UserNotificationPreference e where e.user.id = :userId")
                .setParameter("userId", userId)
                .getResultList();
    }

    @Override
    public Optional<UserNotificationPreference> findByUserIdAndModuleCode(
            Long userId, NotificationModuleCode moduleCode) {
        return hql("select e from UserNotificationPreference e where e.user.id = :userId and e.moduleCode = :moduleCode")
                .setParameter("userId", userId)
                .setParameter("moduleCode", moduleCode)
                .uniqueResultOptional();
    }
}
