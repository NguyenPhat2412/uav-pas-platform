-- Enterprise identity used on VAT invoices and for on-site emergency contact; one row per user.
CREATE TABLE IF NOT EXISTS customer_billing_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    organization_name VARCHAR(200),
    tax_code VARCHAR(14),
    billing_address VARCHAR(500),
    emergency_contact_name VARCHAR(120),
    emergency_contact_phone VARCHAR(20),
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP(6)
);
