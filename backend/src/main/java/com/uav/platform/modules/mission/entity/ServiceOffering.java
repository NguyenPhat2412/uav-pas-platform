package com.uav.platform.modules.mission.entity;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.modules.mission.enums.*;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity(name = "UavService")
@Table(name = "uav_services")
@Getter
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

    public ServiceOffering(
            String code, String name, String description, int defaultDurationMinutes) {
        if (defaultDurationMinutes <= 0)
            throw new IllegalArgumentException("Default duration must be positive");
        this.code = code;
        this.name = name;
        this.description = description;
        this.defaultDurationMinutes = defaultDurationMinutes;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
