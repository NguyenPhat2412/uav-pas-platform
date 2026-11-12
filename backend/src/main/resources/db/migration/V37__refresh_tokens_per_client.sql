-- V37: One refresh token per user *and client kind* instead of one per user.
-- Signing in on the iPhone app used to delete the web session's refresh token (and the reverse), so
-- the other device was signed out at its next refresh. A web sign-in still replaces the previous web
-- session, an iOS sign-in the previous iOS session; password changes and admin sign-outs still revoke all.
ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_key;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS client VARCHAR(16) NOT NULL DEFAULT 'WEB';
CREATE INDEX IF NOT EXISTS idx_refresh_token_user_client ON refresh_tokens (user_id, client);
