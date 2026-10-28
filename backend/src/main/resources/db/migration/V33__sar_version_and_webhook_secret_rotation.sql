-- SAR edits carry expectedVersion; the row version guards against overwriting a newer search area.
ALTER TABLE sar_missions ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- Secret rotation keeps the previous signing secret valid for a grace period (24 h).
ALTER TABLE webhook_subscriptions ADD COLUMN IF NOT EXISTS previous_secret_key VARCHAR(120);
ALTER TABLE webhook_subscriptions ADD COLUMN IF NOT EXISTS previous_secret_expires_at TIMESTAMP(6);
