package com.uav.platform.specification.weather;

import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.entity.weather.WeatherObservationCache;

import java.time.LocalDateTime;

public final class WeatherObservationSpecifications {
    private WeatherObservationSpecifications() {}

    /** Cells whose rounded coordinates lie within {@code radius} degrees of the given point. */
    public static HibernateSpecification<WeatherObservationCache> withinGrid(
            double lat, double lng, double radius) {
        return (root, query, cb) ->
                cb.and(
                        cb.between(root.get("gridLat"), lat - radius, lat + radius),
                        cb.between(root.get("gridLng"), lng - radius, lng + radius));
    }

    public static HibernateSpecification<WeatherObservationCache> byProvider(String provider) {
        return (root, query, cb) ->
                provider == null || provider.isBlank()
                        ? cb.conjunction()
                        : cb.equal(root.get("provider"), provider);
    }

    public static HibernateSpecification<WeatherObservationCache> fetchedAfter(
            LocalDateTime cutoff) {
        return (root, query, cb) ->
                cutoff == null ? cb.conjunction() : cb.greaterThan(root.get("fetchedAt"), cutoff);
    }
}
