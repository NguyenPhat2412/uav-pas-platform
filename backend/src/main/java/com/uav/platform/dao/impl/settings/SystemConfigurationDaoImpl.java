package com.uav.platform.dao.impl.settings;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.settings.ISystemConfigurationDao;
import com.uav.platform.entity.settings.SystemConfiguration;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class SystemConfigurationDaoImpl extends HibernateGenericDao<Long, SystemConfiguration>
        implements ISystemConfigurationDao {

    private static final Logger logger = LoggerFactory.getLogger(SystemConfigurationDaoImpl.class);

    public SystemConfigurationDaoImpl(final EntityManager entityManager) {
        super(SystemConfiguration.class, entityManager);
    }

    @Override
    public Optional<SystemConfiguration> findByConfigKey(String configKey) {
        return hql("select e from SystemConfiguration e where e.configKey = :configKey")
                .setParameter("configKey", configKey)
                .uniqueResultOptional();
    }

    @Override
    public List<SystemConfiguration> findByCategory(String category) {
        return hql("select e from SystemConfiguration e where e.category = :category")
                .setParameter("category", category)
                .getResultList();
    }

    @Override
    public List<SystemConfiguration> findByPublicSettingTrueOrderByConfigKeyAsc() {
        return hql("select e from SystemConfiguration e where e.publicSetting = true order by e.configKey asc")
                .getResultList();
    }
}
