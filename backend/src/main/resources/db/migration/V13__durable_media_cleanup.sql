-- Persist storage cleanup intent with its tombstone, so a crash can always retry safely.
ALTER TABLE media_assets ADD COLUMN upload_valid_until timestamp(6);
-- Fence any pre-migration signed PUTs, whose validity was at most 15 minutes.
UPDATE media_assets SET upload_valid_until=CURRENT_TIMESTAMP + INTERVAL '15 minutes' WHERE deleted=false AND confirmed=false;
ALTER TABLE media_assets ADD COLUMN delete_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE media_assets ADD COLUMN delete_after timestamp(6);
ALTER TABLE media_assets ADD COLUMN object_deleted_at timestamp(6);
UPDATE media_assets SET delete_after=CURRENT_TIMESTAMP WHERE deleted=true;
CREATE INDEX idx_media_cleanup_pending ON media_assets(delete_after,id) WHERE deleted=true;
CREATE INDEX idx_media_unconfirmed_expiry ON media_assets(created_at,id) WHERE deleted=false AND confirmed=false;
