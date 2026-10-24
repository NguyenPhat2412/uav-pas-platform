package com.uav.platform.modules.uav.entity;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** One telemetry sample reported by a ground station or UAV gateway. */
@Entity
@Table(name = "uav_telemetry")
@Getter
@Setter
@NoArgsConstructor
public class UavTelemetry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "uav_id", nullable = false)
    private Long uavId;

    @Column(name = "mission_id")
    private Long missionId;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "altitude_agl_m")
    private Double altitudeAglMeters;

    @Column(name = "ground_speed_ms")
    private Double groundSpeedMs;

    @Column(name = "heading_deg")
    private Double headingDeg;

    @Column(name = "battery_pct")
    private Integer batteryPct;

    @Column(name = "rtk_status", length = 16)
    private String rtkStatus;

    private Integer satellites;

    @Column(name = "reported_by", nullable = false, length = 50)
    private String reportedBy;
}
