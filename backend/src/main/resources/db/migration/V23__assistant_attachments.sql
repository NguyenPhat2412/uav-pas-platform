-- Images a user attached to an assistant question (photos, or frames taken from a video in the browser).
-- They are compressed client-side and capped server-side, so they are kept inline with the chat log.
CREATE TABLE IF NOT EXISTS assistant_attachments (
    id          BIGSERIAL PRIMARY KEY,
    message_id  BIGINT       NOT NULL REFERENCES assistant_messages (id) ON DELETE CASCADE,
    kind        VARCHAR(16)  NOT NULL,
    mime_type   VARCHAR(32)  NOT NULL,
    name        VARCHAR(160),
    size_bytes  INTEGER      NOT NULL,
    data        BYTEA        NOT NULL,
    created_at  TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assistant_attachments_message ON assistant_attachments (message_id, id);
