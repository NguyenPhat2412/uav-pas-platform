package com.uav.platform.repository.weather;

import com.uav.platform.entity.weather.WeatherProviderSettings;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface WeatherProviderSettingsRepository
        extends JpaRepository<WeatherProviderSettings, Integer>,
                JpaSpecificationExecutor<WeatherProviderSettings> {}
