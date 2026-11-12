-- Assistant chat history across the customer, operations and admin portals, reviewable by administrators.
-- User identity is snapshotted so a conversation stays readable after the account changes.
CREATE TABLE IF NOT EXISTS assistant_conversations (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    username       VARCHAR(100) NOT NULL,
    full_name      VARCHAR(160),
    portal         VARCHAR(20)  NOT NULL,
    title          VARCHAR(160) NOT NULL,
    message_count  INTEGER      NOT NULL DEFAULT 0,
    total_tokens   INTEGER      NOT NULL DEFAULT 0,
    created_at     TIMESTAMP(6) NOT NULL,
    updated_at     TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_updated ON assistant_conversations (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user ON assistant_conversations (user_id);

CREATE TABLE IF NOT EXISTS assistant_messages (
    id                BIGSERIAL PRIMARY KEY,
    conversation_id   BIGINT      NOT NULL REFERENCES assistant_conversations (id) ON DELETE CASCADE,
    role              VARCHAR(10) NOT NULL,
    content           TEXT        NOT NULL,
    mode              SMALLINT,
    model             VARCHAR(120),
    prompt_tokens     INTEGER,
    completion_tokens INTEGER,
    latency_ms        INTEGER,
    created_at        TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation ON assistant_messages (conversation_id, id);
