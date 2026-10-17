-- Existing V4–V8 schemas must match the audit fields inherited by their entities.
-- Keep published migrations immutable; apply the repair on both fresh and upgraded databases.
ALTER TABLE ai_tasks ADD COLUMN updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE ai_detections ADD COLUMN updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE system_configurations ADD COLUMN created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
