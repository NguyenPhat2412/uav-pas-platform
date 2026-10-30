package com.uav.platform.modules.weather.entity;

import com.uav.platform.common.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Hourly forecast series for one ~1.1 km grid cell, starting at its local target hour. */
@Entity
@Table(name = "weather_observations_cache")
@Getter
@Setter
@NoArgsConstructor
public class WeatherObservationCache extends BaseEntity {

    @Column(name = "grid_lat", nullable = false)
    private Double gridLat;

    @Column(name = "grid_lng", nullable = false)
    private Double gridLng;

    /** Local time {@code yyyy-MM-ddTHH:00} (Asia/Ho_Chi_Minh). */
    @Column(name = "target_hour", nullable = false, length = 16)
    private String targetHour;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "payload_json", nullable = false, columnDefinition = "TEXT")
    private String payloadJson;

    @Column(name = "kp_index")
    private Double kpIndex;

    @Column(name = "fetched_at", nullable = false)
    private LocalDateTime fetchedAt;

    public WeatherObservationCache(
            Double gridLat,
            Double gridLng,
            String targetHour,
            String provider,
            String payloadJson,
            Double kpIndex,
            LocalDateTime fetchedAt) {
        this.gridLat = gridLat;
        this.gridLng = gridLng;
        this.targetHour = targetHour;
        this.provider = provider;
        this.payloadJson = payloadJson;
        this.kpIndex = kpIndex;
        this.fetchedAt = fetchedAt;
    }
}
