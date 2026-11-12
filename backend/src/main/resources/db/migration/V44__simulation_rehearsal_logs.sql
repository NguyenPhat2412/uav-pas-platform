-- ==============================================================================
-- V44__simulation_rehearsal_logs.sql
-- Persistent UAV Digital Flight Rehearsal & Simulation Run Audit Logs
-- Stores wind/physics settings, link delivery metrics, airspace breach counts,
-- battery consumption, and final rehearsal outcomes in PostgreSQL.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS simulation_run_logs (
    id BIGSERIAL PRIMARY KEY,
    uav_id BIGINT NOT NULL REFERENCES uavs(id) ON DELETE CASCADE,
    uav_code VARCHAR(120) NOT NULL,
    mission_id BIGINT REFERENCES missions(id) ON DELETE SET NULL,
    mission_code VARCHAR(60),
    started_by VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    altitude_m DOUBLE PRECISION NOT NULL,
    cruise_speed_ms DOUBLE PRECISION NOT NULL,
    wind_speed_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
    wind_direction_deg DOUBLE PRECISION NOT NULL DEFAULT 0,
    time_scale DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    packet_loss_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 150,
    start_battery_pct DOUBLE PRECISION NOT NULL DEFAULT 100,
    end_battery_pct DOUBLE PRECISION,
    waypoint_count INTEGER NOT NULL DEFAULT 0,
    waypoints_reached INTEGER NOT NULL DEFAULT 0,
    distance_flown_m DOUBLE PRECISION NOT NULL DEFAULT 0,
    elapsed_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
    samples_sent BIGINT NOT NULL DEFAULT 0,
    samples_delivered BIGINT NOT NULL DEFAULT 0,
    samples_lost BIGINT NOT NULL DEFAULT 0,
    airspace_breaches INTEGER NOT NULL DEFAULT 0,
    gps_degraded BOOLEAN NOT NULL DEFAULT FALSE,
    outcome_summary VARCHAR(500),
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_simulation_run_logs_started
    ON simulation_run_logs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_simulation_run_logs_uav
    ON simulation_run_logs (uav_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_simulation_run_logs_mission
    ON simulation_run_logs (mission_id, started_at DESC);

-- Seed 2 authentic historical rehearsal logs attached to existing UAVs if present
INSERT INTO simulation_run_logs (
    uav_id,
    uav_code,
    mission_id,
    mission_code,
    started_by,
    status,
    altitude_m,
    cruise_speed_ms,
    wind_speed_ms,
    wind_direction_deg,
    time_scale,
    packet_loss_pct,
    latency_ms,
    start_battery_pct,
    end_battery_pct,
    waypoint_count,
    waypoints_reached,
    distance_flown_m,
    elapsed_seconds,
    samples_sent,
    samples_delivered,
    samples_lost,
    airspace_breaches,
    gps_degraded,
    outcome_summary,
    started_at,
    ended_at
)
SELECT
    u.id,
    u.serial_number || ' · ' || u.model,
    NULL,
    NULL,
    'commander',
    'COMPLETED',
    60.0,
    9.0,
    4.5,
    45.0,
    2.0,
    2.0,
    140,
    98.0,
    74.2,
    12,
    12,
    1840.5,
    246.0,
    123,
    120,
    3,
    0,
    FALSE,
    'Hoàn tất bay diễn tập quét luống 12 điểm dưới gió Đông Bắc 4.5 m/s, hạ cánh an toàn tại điểm Home.',
    CURRENT_TIMESTAMP - INTERVAL '6 hours',
    CURRENT_TIMESTAMP - INTERVAL '5 hours 56 minutes'
FROM uavs u
ORDER BY u.id ASC
LIMIT 1;

INSERT INTO simulation_run_logs (
    uav_id,
    uav_code,
    mission_id,
    mission_code,
    started_by,
    status,
    altitude_m,
    cruise_speed_ms,
    wind_speed_ms,
    wind_direction_deg,
    time_scale,
    packet_loss_pct,
    latency_ms,
    start_battery_pct,
    end_battery_pct,
    waypoint_count,
    waypoints_reached,
    distance_flown_m,
    elapsed_seconds,
    samples_sent,
    samples_delivered,
    samples_lost,
    airspace_breaches,
    gps_degraded,
    outcome_summary,
    started_at,
    ended_at
)
SELECT
    u.id,
    u.serial_number || ' · ' || u.model,
    NULL,
    NULL,
    'operator',
    'FAILSAFE_RTH',
    80.0,
    10.0,
    8.2,
    90.0,
    1.0,
    5.0,
    180,
    85.0,
    61.5,
    8,
    4,
    920.0,
    135.0,
    135,
    128,
    7,
    1,
    TRUE,
    'Kích hoạt tự động RTH khi diễn tập chạm rìa vùng hạn chế bay và thử nghiệm suy giảm tín hiệu RTK.',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    CURRENT_TIMESTAMP - INTERVAL '1 hour 57 minutes'
FROM uavs u
ORDER BY u.id DESC
LIMIT 1;
