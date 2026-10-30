package com.uav.platform.modules.weather.specification;

import com.uav.platform.modules.weather.entity.WeatherObservationCache;

import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public final class WeatherObservationSpecifications {
    private WeatherObservationSpecifications() {}

    /** Cells whose rounded coordinates lie within {@code radius} degrees of the given point. */
    public static Specification<WeatherObservationCache> withinGrid(
            double lat, double lng, double radius) {
        return (root, query, cb) ->
                cb.and(
                        cb.between(root.get("gridLat"), lat - radius, lat + radius),
                        cb.between(root.get("gridLng"), lng - radius, lng + radius));
    }

    public static Specification<WeatherObservationCache> byProvider(String provider) {
        return (root, query, cb) ->
                provider == null || provider.isBlank()
                        ? cb.conjunction()
                        : cb.equal(root.get("provider"), provider);
    }

    public static Specification<WeatherObservationCache> fetchedAfter(LocalDateTime cutoff) {
        return (root, query, cb) ->
                cutoff == null ? cb.conjunction() : cb.greaterThan(root.get("fetchedAt"), cutoff);
    }
}
