package com.uav.platform.dao.impl;

import com.uav.platform.dao.INotificationModulePolicyDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.NotificationModulePolicy;
import com.uav.platform.enums.NotificationModuleCode;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class NotificationModulePolicyDaoImpl
        extends HibernateGenericDao<Long, NotificationModulePolicy>
        implements INotificationModulePolicyDao {

    private static final Logger logger =
            LoggerFactory.getLogger(NotificationModulePolicyDaoImpl.class);

    public NotificationModulePolicyDaoImpl(final EntityManager entityManager) {
        super(NotificationModulePolicy.class, entityManager);
    }

    @Override
    public List<NotificationModulePolicy> findAllByOrderBySortOrderAscIdAsc() {
        return hql("select e from NotificationModulePolicy e order by e.sortOrder asc, e.id asc")
                .getResultList();
    }

    @Override
    public Optional<NotificationModulePolicy> findByModuleCode(NotificationModuleCode moduleCode) {
        return hql("select e from NotificationModulePolicy e where e.moduleCode = :moduleCode")
                .setParameter("moduleCode", moduleCode)
                .uniqueResultOptional();
    }
}
