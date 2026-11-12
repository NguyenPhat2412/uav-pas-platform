-- Structured customer flight plan (area geometry, altitude, GSD, overlap, sensors, site safety) as validated JSON.
ALTER TABLE missions ADD COLUMN IF NOT EXISTS flight_plan TEXT;
