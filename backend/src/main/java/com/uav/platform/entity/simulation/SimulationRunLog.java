package com.uav.platform.entity.simulation;

import com.uav.platform.enums.simulation.SimRunStatus;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "simulation_run_logs")
@Getter
@Setter
@NoArgsConstructor
public class SimulationRunLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "uav_id", nullable = false)
    private Long uavId;

    @Column(name = "uav_code", nullable = false, length = 120)
    private String uavCode;

    @Column(name = "mission_id")
    private Long missionId;

    @Column(name = "mission_code", length = 60)
    private String missionCode;

    @Column(name = "started_by", nullable = false, length = 100)
    private String startedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SimRunStatus status;

    @Column(name = "altitude_m", nullable = false)
    private double altitudeM;

    @Column(name = "cruise_speed_ms", nullable = false)
    private double cruiseSpeedMs;

    @Column(name = "wind_speed_ms", nullable = false)
    private double windSpeedMs;

    @Column(name = "wind_direction_deg", nullable = false)
    private double windDirectionDeg;

    @Column(name = "time_scale", nullable = false)
    private double timeScale;

    @Column(name = "packet_loss_pct", nullable = false)
    private double packetLossPct;

    @Column(name = "latency_ms", nullable = false)
    private int latencyMs;

    @Column(name = "start_battery_pct", nullable = false)
    private double startBatteryPct;

    @Column(name = "end_battery_pct")
    private Double endBatteryPct;

    @Column(name = "waypoint_count", nullable = false)
    private int waypointCount;

    @Column(name = "waypoints_reached", nullable = false)
    private int waypointsReached;

    @Column(name = "distance_flown_m", nullable = false)
    private double distanceFlownM;

    @Column(name = "elapsed_seconds", nullable = false)
    private double elapsedSeconds;

    @Column(name = "samples_sent", nullable = false)
    private long samplesSent;

    @Column(name = "samples_delivered", nullable = false)
    private long samplesDelivered;

    @Column(name = "samples_lost", nullable = false)
    private long samplesLost;

    @Column(name = "airspace_breaches", nullable = false)
    private int airspaceBreaches;

    @Column(name = "gps_degraded", nullable = false)
    private boolean gpsDegraded;

    @Column(name = "outcome_summary", length = 500)
    private String outcomeSummary;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;
}
