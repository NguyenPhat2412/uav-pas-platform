package com.uav.platform.modules.weather.repository;

import com.uav.platform.modules.weather.entity.WeatherProviderSettings;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface WeatherProviderSettingsRepository
        extends JpaRepository<WeatherProviderSettings, Integer>,
                JpaSpecificationExecutor<WeatherProviderSettings> {}
