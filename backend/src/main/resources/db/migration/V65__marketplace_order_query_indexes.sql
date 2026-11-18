-- ==============================================================================
-- V65__marketplace_order_query_indexes.sql
-- 1. Composite covering indexes for Shopee-style marketplace order & project queries
-- 2. Normalize demo_* seed emails to @uav.local so automated QA never triggers external SMTP
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_missions_customer_status_created
    ON missions (customer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_missions_dispatch_queue
    ON missions (status, provider_response_status, provider_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_missions_provider_status_created
    ON missions (provider_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_missions_project_status_created
    ON missions (project_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_missions_operator_status_created
    ON missions (operator_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mission_reviews_mission
    ON mission_reviews (mission_id);

UPDATE users
SET email = REPLACE(email, '@gmail.com', '@uav.local')
WHERE username IN ('demo_admin', 'demo_customer', 'demo_fleet', 'demo_fleet_north', 'demo_pilot')
  AND email LIKE '%@gmail.com';
