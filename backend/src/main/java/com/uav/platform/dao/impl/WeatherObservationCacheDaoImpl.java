package com.uav.platform.dao.impl;

import com.uav.platform.dao.IWeatherObservationCacheDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.WeatherObservationCache;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public class WeatherObservationCacheDaoImpl
        extends HibernateGenericDao<Long, WeatherObservationCache>
        implements IWeatherObservationCacheDao {

    private static final Logger logger =
            LoggerFactory.getLogger(WeatherObservationCacheDaoImpl.class);

    public WeatherObservationCacheDaoImpl(final EntityManager entityManager) {
        super(WeatherObservationCache.class, entityManager);
    }

    @Override
    public Optional<WeatherObservationCache> findByGridLatAndGridLngAndTargetHourAndProvider(
            Double gridLat, Double gridLng, String targetHour, String provider) {
        return hql("select e from WeatherObservationCache e where e.gridLat = :gridLat and e.gridLng = :gridLng and e.targetHour = :targetHour and e.provider = :provider")
                .setParameter("gridLat", gridLat)
                .setParameter("gridLng", gridLng)
                .setParameter("targetHour", targetHour)
                .setParameter("provider", provider)
                .uniqueResultOptional();
    }

    @Override
    @Transactional
    public long deleteByFetchedAtBefore(LocalDateTime cutoff) {
        return (long)
                hqlMutation("delete from WeatherObservationCache e where e.fetchedAt < :cutoff")
                        .setParameter("cutoff", cutoff)
                        .executeUpdate();
    }
}
