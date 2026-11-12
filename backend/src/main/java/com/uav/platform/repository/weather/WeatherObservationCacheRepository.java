package com.uav.platform.repository.weather;

import com.uav.platform.entity.weather.WeatherObservationCache;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface WeatherObservationCacheRepository
        extends JpaRepository<WeatherObservationCache, Long>,
                JpaSpecificationExecutor<WeatherObservationCache> {
    Optional<WeatherObservationCache> findByGridLatAndGridLngAndTargetHourAndProvider(
            Double gridLat, Double gridLng, String targetHour, String provider);

    @Transactional
    long deleteByFetchedAtBefore(LocalDateTime cutoff);
}
