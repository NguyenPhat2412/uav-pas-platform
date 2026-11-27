package com.uav.platform.dao.impl;

import com.uav.platform.dao.IWeatherProviderSettingsDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.WeatherProviderSettings;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

@Repository
public class WeatherProviderSettingsDaoImpl
        extends HibernateGenericDao<Integer, WeatherProviderSettings>
        implements IWeatherProviderSettingsDao {

    private static final Logger logger =
            LoggerFactory.getLogger(WeatherProviderSettingsDaoImpl.class);

    public WeatherProviderSettingsDaoImpl(final EntityManager entityManager) {
        super(WeatherProviderSettings.class, entityManager);
    }
}
