-- ==============================================================================
-- V58__support_message_delivery_and_read_receipts.sql
-- Ordered Message Delivery & Read Receipts (Sent -> Delivered -> Seen) for Support Chat
-- ==============================================================================

ALTER TABLE support_messages
    ADD COLUMN delivered_at TIMESTAMP(6);

ALTER TABLE support_messages
    ADD COLUMN read_at TIMESTAMP(6);

ALTER TABLE support_messages
    ADD COLUMN seen_by_name VARCHAR(120);

CREATE INDEX idx_support_messages_thread_receipts
    ON support_messages (thread_id, sender_role, delivered_at, read_at);

UPDATE support_messages
SET delivered_at = COALESCE(delivered_at, created_at),
    read_at = COALESCE(read_at, created_at),
    seen_by_name = COALESCE(seen_by_name, 'Quản trị viên')
WHERE sender_role = 'VISITOR'
  AND thread_id IN (SELECT id FROM support_threads WHERE unread_for_admin = 0);

UPDATE support_messages
SET delivered_at = COALESCE(delivered_at, created_at),
    read_at = COALESCE(read_at, created_at),
    seen_by_name = COALESCE(
        seen_by_name,
        (SELECT full_name FROM support_threads WHERE support_threads.id = support_messages.thread_id)
    )
WHERE sender_role = 'ADMIN'
  AND thread_id IN (SELECT id FROM support_threads WHERE unread_for_visitor = 0);
