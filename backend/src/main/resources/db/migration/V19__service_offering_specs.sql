-- Customer-facing technical sheet per service. NULL means "not committed": the catalog shows "contact dispatch".
ALTER TABLE uav_services ADD COLUMN IF NOT EXISTS sensors VARCHAR(100);
ALTER TABLE uav_services ADD COLUMN IF NOT EXISTS best_gsd_cm DOUBLE PRECISION;
ALTER TABLE uav_services ADD COLUMN IF NOT EXISTS max_area_hectares DOUBLE PRECISION;
ALTER TABLE uav_services ADD COLUMN IF NOT EXISTS max_wind_ms DOUBLE PRECISION;
ALTER TABLE uav_services ADD COLUMN IF NOT EXISTS on_site_hours INTEGER;
ALTER TABLE uav_services ADD COLUMN IF NOT EXISTS delivery_hours INTEGER;
