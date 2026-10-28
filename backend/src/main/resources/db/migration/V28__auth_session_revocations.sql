-- V28: Admin-initiated session revocation.
-- Access tokens are stateless JWTs; an admin "sign out everywhere" records a per-user cut-off and
-- the JWT filter rejects any access token whose issued-at is not after it. Refresh tokens are
-- revoked directly in refresh_tokens.
CREATE TABLE IF NOT EXISTS auth_session_revocations (
    user_id        BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    revoked_before TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    revoked_by     VARCHAR(100),
    updated_at     TIMESTAMP(6) WITH TIME ZONE NOT NULL
);
