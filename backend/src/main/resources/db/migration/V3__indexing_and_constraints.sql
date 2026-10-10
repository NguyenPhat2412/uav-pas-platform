-- Flyway Migration V3: Add indexes and constraints for Phase 1 UAV Operations
-- Improves query performance for mission scheduling, conflict checks, timeline, equipment tracking, and audit logging.

-- 1. Missions Scheduling & Operations Indexes
CREATE INDEX IF NOT EXISTS idx_missions_uav_schedule ON missions (uav_id, start_time, expected_end_time);
CREATE INDEX IF NOT EXISTS idx_missions_operator_schedule ON missions (operator_id, start_time, expected_end_time);
CREATE INDEX IF NOT EXISTS idx_missions_customer_status ON missions (customer_id, status);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions (status);
CREATE INDEX IF NOT EXISTS idx_missions_station_id ON missions (station_id);

-- 2. Mission Events & Timeline Indexes
CREATE INDEX IF NOT EXISTS idx_mission_events_mission_created ON mission_events (mission_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mission_events_actor ON mission_events (actor_id);

-- 3. Equipment Reservations Indexes
CREATE INDEX IF NOT EXISTS idx_mer_mission_released ON mission_equipment_reservations (mission_id, released);
CREATE INDEX IF NOT EXISTS idx_mer_equipment_id ON mission_equipment_reservations (equipment_id);

-- 4. UAV Status History Indexes
CREATE INDEX IF NOT EXISTS idx_uav_status_history_uav_created ON uav_status_history (uav_id, created_at);

-- 5. Inventory Movements Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_equipment ON inventory_movements (equipment_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_stations ON inventory_movements (from_station_id, to_station_id);

-- 6. Audit Logs Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs (actor_user_id, created_at);

-- 7. Media Assets Indexes
CREATE INDEX IF NOT EXISTS idx_media_assets_linked_entity ON media_assets (linked_entity_type, linked_entity_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets (confirmed, deleted);

-- 8. Business Integrity Constraints
ALTER TABLE equipment ADD CONSTRAINT chk_equipment_quantities CHECK (available_quantity >= 0 AND reserved_quantity >= 0 AND quantity >= 0 AND available_quantity + reserved_quantity = quantity);
ALTER TABLE missions ADD CONSTRAINT chk_missions_time_order CHECK (expected_end_time > start_time);
