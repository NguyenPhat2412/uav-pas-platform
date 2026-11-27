package com.uav.platform.dao.impl;

import com.uav.platform.dao.IAiRouterSettingsDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.AiRouterSettings;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

@Repository
public class AiRouterSettingsDaoImpl extends HibernateGenericDao<Short, AiRouterSettings>
        implements IAiRouterSettingsDao {

    private static final Logger logger = LoggerFactory.getLogger(AiRouterSettingsDaoImpl.class);

    public AiRouterSettingsDaoImpl(final EntityManager entityManager) {
        super(AiRouterSettings.class, entityManager);
    }
}
