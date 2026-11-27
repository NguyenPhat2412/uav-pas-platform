package com.uav.platform.dao.impl;

import com.uav.platform.dao.ISystemConfigurationHistoryDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.SystemConfigurationHistory;

import jakarta.persistence.EntityManager;

import org.hibernate.query.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class SystemConfigurationHistoryDaoImpl
        extends HibernateGenericDao<Long, SystemConfigurationHistory>
        implements ISystemConfigurationHistoryDao {

    private static final Logger logger =
            LoggerFactory.getLogger(SystemConfigurationHistoryDaoImpl.class);

    public SystemConfigurationHistoryDaoImpl(final EntityManager entityManager) {
        super(SystemConfigurationHistory.class, entityManager);
    }

    @Override
    public List<SystemConfigurationHistory> findByConfigKeyOrderByChangedAtDescIdDesc(
            String configKey, Pageable pageable) {
        String effectiveHql =
                appendPageableSort(
                        "select e from SystemConfigurationHistory e where e.configKey = :configKey order by e.changedAt desc, e.id desc",
                        pageable);
        Query<SystemConfigurationHistory> q =
                hql(effectiveHql).setParameter("configKey", configKey);
        if (pageable != null && pageable.isPaged()) {
            q.setFirstResult((int) pageable.getOffset());
            q.setMaxResults(pageable.getPageSize());
        }
        return q.getResultList();
    }
}
