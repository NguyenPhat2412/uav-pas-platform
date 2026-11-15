-- ==============================================================================
-- V53__marketplace_booking_and_mission_tenancy.sql
-- Two-Sided UAV Marketplace Phase 2: Marketplace Booking Snapshot & Provider Orders
-- ==============================================================================

ALTER TABLE missions ADD COLUMN provider_id BIGINT REFERENCES provider_profiles(id) ON DELETE SET NULL;
ALTER TABLE missions ADD COLUMN listing_id BIGINT REFERENCES marketplace_listings(id) ON DELETE SET NULL;
ALTER TABLE missions ADD COLUMN pricing_model_snapshot VARCHAR(30);
ALTER TABLE missions ADD COLUMN unit_price_snapshot_vnd NUMERIC(14, 2);
ALTER TABLE missions ADD COLUMN booking_units NUMERIC(10, 2);
ALTER TABLE missions ADD COLUMN quoted_subtotal_vnd NUMERIC(14, 2);
ALTER TABLE missions ADD COLUMN security_deposit_vnd NUMERIC(14, 2);
ALTER TABLE missions ADD COLUMN provider_response_status VARCHAR(30) NOT NULL DEFAULT 'NOT_APPLICABLE';
ALTER TABLE missions ADD COLUMN provider_response_note VARCHAR(1000);
ALTER TABLE missions ADD COLUMN provider_responded_at TIMESTAMP(6);

CREATE INDEX idx_missions_provider_status
    ON missions (provider_id, status, created_at DESC);

CREATE INDEX idx_missions_listing
    ON missions (listing_id);

CREATE INDEX idx_missions_rfq_open
    ON missions (provider_response_status, status, created_at DESC);
