-- V30: Auth hardening.
-- A TOTP setup is stored as pending until a code confirms it, so starting a new setup no longer
-- replaces the authenticator the account is using. totp_last_step blocks replay of a TOTP code
-- inside its validity window.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS pending_totp_secret VARCHAR(128),
    ADD COLUMN IF NOT EXISTS totp_last_step BIGINT;

-- A restarted sign-up of an unverified account keeps the new details on its OTP challenge and
-- applies them only once the email is proven.
ALTER TABLE auth_otp_tokens
    ADD COLUMN IF NOT EXISTS pending_username VARCHAR(50),
    ADD COLUMN IF NOT EXISTS pending_phone_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS pending_password_hash VARCHAR(255);

-- users.email_verified keeps DEFAULT TRUE so existing and seeded accounts stay verified; the
-- application now sets the value explicitly on every insert.
