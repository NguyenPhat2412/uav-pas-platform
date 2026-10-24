package com.uav.platform.modules.mission.entity;

import com.uav.platform.common.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "UavService")
@Table(name = "uav_services")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ServiceOffering extends BaseEntity {
    @Column(nullable = false, unique = true, length = 60)
    private String code;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "default_duration_minutes", nullable = false)
    private int defaultDurationMinutes;

    /** Comma-separated FlightSensor codes the service flies with. */
    @Column(length = 100)
    private String sensors;

    @Column(name = "best_gsd_cm")
    private Double bestGsdCm;

    @Column(name = "max_area_hectares")
    private Double maxAreaHectares;

    @Column(name = "max_wind_ms")
    private Double maxWindMs;

    @Column(name = "on_site_hours")
    private Integer onSiteHours;

    @Column(name = "delivery_hours")
    private Integer deliveryHours;

    public ServiceOffering(
            String code, String name, String description, int defaultDurationMinutes) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.defaultDurationMinutes = defaultDurationMinutes;
    }
}
