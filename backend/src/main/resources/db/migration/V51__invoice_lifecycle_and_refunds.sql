-- Invoice lifecycle: one open invoice per mission, no debt for missions that will not fly,
-- and an audit trail for transfers an admin refunds or accepts by hand.

-- A cancelled or rejected mission is never billed.
UPDATE invoices i
SET status = 'CANCELLED',
    notes = LEFT(COALESCE(i.notes || ' ', '') || '[Hủy tự động: nhiệm vụ đã hủy/từ chối]', 500),
    updated_at = CURRENT_TIMESTAMP
FROM missions m
WHERE i.mission_id = m.id
  AND i.status = 'PENDING'
  AND m.status IN ('CANCELLED', 'REJECTED');

-- A mission that is already paid owes nothing more.
UPDATE invoices i
SET status = 'CANCELLED',
    notes = LEFT(COALESCE(i.notes || ' ', '') || '[Hủy tự động: nhiệm vụ đã thanh toán]', 500),
    updated_at = CURRENT_TIMESTAMP
WHERE i.status = 'PENDING'
  AND i.mission_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM invoices p WHERE p.mission_id = i.mission_id AND p.status = 'PAID');

-- Keep only the newest open invoice of each mission.
UPDATE invoices i
SET status = 'CANCELLED',
    notes = LEFT(COALESCE(i.notes || ' ', '') || '[Hủy tự động: hóa đơn trùng]', 500),
    updated_at = CURRENT_TIMESTAMP
WHERE i.status = 'PENDING'
  AND i.mission_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM invoices n
              WHERE n.mission_id = i.mission_id AND n.status = 'PENDING' AND n.id > i.id);

CREATE UNIQUE INDEX uq_invoices_open_mission
    ON invoices (mission_id)
    WHERE status = 'PENDING' AND mission_id IS NOT NULL;

CREATE INDEX idx_invoices_status_due ON invoices (status, due_date);

ALTER TABLE payment_transactions ADD COLUMN resolution VARCHAR(30);
ALTER TABLE payment_transactions ADD COLUMN resolution_note VARCHAR(500);
ALTER TABLE payment_transactions ADD COLUMN resolved_at TIMESTAMP(6);
ALTER TABLE payment_transactions ADD COLUMN resolved_by VARCHAR(100);
