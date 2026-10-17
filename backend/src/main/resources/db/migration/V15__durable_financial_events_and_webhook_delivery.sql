CREATE TABLE financial_outbox_events (
 id VARCHAR(150) PRIMARY KEY,
 event_type VARCHAR(80) NOT NULL,
 invoice_id BIGINT NOT NULL REFERENCES invoices(id),
 user_id BIGINT NOT NULL REFERENCES users(id),
 payload TEXT NOT NULL,
 status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
 attempts INTEGER NOT NULL DEFAULT 0,
 notification_created BOOLEAN NOT NULL DEFAULT false,
 last_error VARCHAR(80),
 next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_financial_outbox_due ON financial_outbox_events(status,next_attempt_at,id);
ALTER TABLE webhook_delivery_logs ADD COLUMN event_id VARCHAR(150);
ALTER TABLE webhook_delivery_logs ADD COLUMN delivery_status VARCHAR(24) NOT NULL DEFAULT 'QUEUED';
ALTER TABLE webhook_delivery_logs ADD COLUMN next_attempt_at TIMESTAMP;
-- Historic demo records do not prove receipt and must never be replayed as real sends.
UPDATE webhook_delivery_logs SET delivery_status='LEGACY_UNVERIFIED';
CREATE UNIQUE INDEX uq_webhook_event_subscription ON webhook_delivery_logs(event_id,subscription_id);
CREATE INDEX idx_webhook_delivery_due ON webhook_delivery_logs(delivery_status,next_attempt_at,id);
-- Existing seed destinations require explicit reconfiguration and operator-reviewed runtime allowlist.
UPDATE webhook_subscriptions SET is_active=false;

-- Retain dispatch identity and outcomes when an operator removes a destination.
-- Supported DELETE tombstones the subscription and cancels pending deliveries.
ALTER TABLE webhook_subscriptions ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE webhook_delivery_logs DROP CONSTRAINT webhook_delivery_logs_subscription_id_fkey;
ALTER TABLE webhook_delivery_logs ADD CONSTRAINT fk_webhook_delivery_retained_subscription
 FOREIGN KEY (subscription_id) REFERENCES webhook_subscriptions(id) ON DELETE RESTRICT;
