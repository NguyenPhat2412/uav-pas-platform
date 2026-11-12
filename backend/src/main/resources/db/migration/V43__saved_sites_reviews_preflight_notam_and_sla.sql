-- ==============================================================================
-- V43__saved_sites_reviews_preflight_notam_and_sla.sql
-- 1. Temporary scheduled civil NOTAM time windows on airspace_zones
-- 2. Customer reusable saved_flight_sites (corridors, altitude, sensors)
-- 3. Customer handover acceptance & service quality mission_reviews
-- 4. Auditable operator pre-flight safety sign-off mission_preflight_logs
-- ==============================================================================

-- 1. Temporary time-windowed airspace zones (Scheduled Civil NOTAMs)
ALTER TABLE airspace_zones
    ADD COLUMN IF NOT EXISTS effective_from TIMESTAMP,
    ADD COLUMN IF NOT EXISTS effective_until TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_airspace_zones_effective
    ON airspace_zones (active, effective_from, effective_until);

-- 2. Customer saved flight sites & corridors
CREATE TABLE IF NOT EXISTS saved_flight_sites (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    default_mission_type VARCHAR(30) NOT NULL,
    flight_plan TEXT,
    notes VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_flight_sites_user_updated
    ON saved_flight_sites (user_id, updated_at DESC);

-- 3. Customer handover sign-off & service quality reviews
CREATE TABLE IF NOT EXISTS mission_reviews (
    id BIGSERIAL PRIMARY KEY,
    mission_id BIGINT NOT NULL UNIQUE REFERENCES missions(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    data_quality_rating INTEGER NOT NULL CHECK (data_quality_rating BETWEEN 1 AND 5),
    timeliness_rating INTEGER NOT NULL CHECK (timeliness_rating BETWEEN 1 AND 5),
    deliverables_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    comment VARCHAR(1500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mission_reviews_customer
    ON mission_reviews (customer_id, created_at DESC);

-- 4. Auditable operator pre-flight safety sign-off logs
CREATE TABLE IF NOT EXISTS mission_preflight_logs (
    id BIGSERIAL PRIMARY KEY,
    mission_id BIGINT NOT NULL UNIQUE REFERENCES missions(id) ON DELETE CASCADE,
    signed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    signed_by_username VARCHAR(100),
    signed_at TIMESTAMP,
    airframe_and_propellers_safe BOOLEAN NOT NULL DEFAULT FALSE,
    battery_healthy BOOLEAN NOT NULL DEFAULT FALSE,
    gnss_rtk_locked BOOLEAN NOT NULL DEFAULT FALSE,
    weather_within_limits BOOLEAN NOT NULL DEFAULT FALSE,
    airspace_and_permit_cleared BOOLEAN NOT NULL DEFAULT FALSE,
    measured_battery_pct INTEGER,
    satellite_count INTEGER,
    measured_wind_ms DOUBLE PRECISION,
    cleared_for_takeoff BOOLEAN NOT NULL DEFAULT FALSE,
    notes VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mission_preflight_logs_signer
    ON mission_preflight_logs (signed_by_user_id, signed_at DESC);
