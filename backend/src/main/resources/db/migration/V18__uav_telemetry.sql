-- Telemetry samples pushed by ground stations / UAV gateways. Only real device reports are stored here.
CREATE TABLE IF NOT EXISTS uav_telemetry (
    id BIGSERIAL PRIMARY KEY,
    uav_id BIGINT NOT NULL REFERENCES uavs(id) ON DELETE CASCADE,
    mission_id BIGINT REFERENCES missions(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP(6) NOT NULL,
    received_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    altitude_agl_m DOUBLE PRECISION,
    ground_speed_ms DOUBLE PRECISION,
    heading_deg DOUBLE PRECISION,
    battery_pct INTEGER,
    rtk_status VARCHAR(16),
    satellites INTEGER,
    reported_by VARCHAR(50) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_uav_telemetry_latest ON uav_telemetry (uav_id, recorded_at DESC);
