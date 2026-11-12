package com.uav.platform.entity.mission;

import com.uav.platform.common.entity.BaseEntity;
import com.uav.platform.entity.user.AppUser;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "mission_preflight_logs")
@Getter
@Setter
@NoArgsConstructor
public class MissionPreflightLog extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mission_id", nullable = false, unique = true)
    private Mission mission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signed_by_user_id")
    private AppUser signedBy;

    @Column(name = "signed_by_username", length = 100)
    private String signedByUsername;

    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    @Column(name = "airframe_and_propellers_safe", nullable = false)
    private boolean airframeAndPropellersSafe;

    @Column(name = "battery_healthy", nullable = false)
    private boolean batteryHealthy;

    @Column(name = "gnss_rtk_locked", nullable = false)
    private boolean gnssRtkLocked;

    @Column(name = "weather_within_limits", nullable = false)
    private boolean weatherWithinLimits;

    @Column(name = "airspace_and_permit_cleared", nullable = false)
    private boolean airspaceAndPermitCleared;

    @Column(name = "measured_battery_pct")
    private Integer measuredBatteryPct;

    @Column(name = "satellite_count")
    private Integer satelliteCount;

    @Column(name = "measured_wind_ms")
    private Double measuredWindMs;

    @Column(name = "cleared_for_takeoff", nullable = false)
    private boolean clearedForTakeoff;

    @Column(length = 1000)
    private String notes;
}
