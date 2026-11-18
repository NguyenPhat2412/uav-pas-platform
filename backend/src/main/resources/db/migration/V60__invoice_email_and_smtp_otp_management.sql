ALTER TABLE customer_billing_profiles
    ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS last_emailed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_emailed_to VARCHAR(255);

CREATE TABLE IF NOT EXISTS mail_otp_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    mail_enabled BOOLEAN,
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_username VARCHAR(255),
    smtp_password_encrypted TEXT,
    smtp_password_hint VARCHAR(32),
    from_address VARCHAR(255),
    sender_display_name VARCHAR(120),
    smtp_auth BOOLEAN,
    smtp_starttls BOOLEAN,
    otp_ttl_minutes INTEGER,
    resend_cooldown_seconds INTEGER,
    max_otp_attempts INTEGER,
    otp_per_account INTEGER,
    otp_per_ip INTEGER,
    max_emails_per_minute INTEGER,
    updated_at TIMESTAMP,
    updated_by VARCHAR(100)
);
