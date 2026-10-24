-- V21: Email OTP Verification & Two-Factor Authentication (2FA)

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS two_factor_method VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(128);

CREATE TABLE IF NOT EXISTS auth_otp_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    purpose VARCHAR(40) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    challenge_token VARCHAR(128) NOT NULL UNIQUE,
    attempts INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_tokens_email_purpose
    ON auth_otp_tokens(email, purpose);

CREATE INDEX IF NOT EXISTS idx_auth_otp_tokens_user_purpose
    ON auth_otp_tokens(user_id, purpose);
