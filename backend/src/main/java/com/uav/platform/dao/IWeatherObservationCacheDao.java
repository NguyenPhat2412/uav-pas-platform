package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.WeatherObservationCache;

import java.time.LocalDateTime;
import java.util.Optional;

public interface IWeatherObservationCacheDao extends IGenericDao<Long, WeatherObservationCache> {
    Optional<WeatherObservationCache> findByGridLatAndGridLngAndTargetHourAndProvider(
            Double gridLat, Double gridLng, String targetHour, String provider);

    long deleteByFetchedAtBefore(LocalDateTime cutoff);
}
