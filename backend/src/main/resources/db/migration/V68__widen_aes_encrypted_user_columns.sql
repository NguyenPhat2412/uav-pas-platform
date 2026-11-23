-- V68: Widen sensitive user PII columns to accommodate AES-256-GCM encrypted ciphertext at rest.
ALTER TABLE users
    ALTER COLUMN totp_secret TYPE VARCHAR(512),
    ALTER COLUMN pending_totp_secret TYPE VARCHAR(512);

ALTER TABLE customer_billing_profiles
    ALTER COLUMN tax_code TYPE VARCHAR(512),
    ALTER COLUMN billing_address TYPE VARCHAR(1024),
    ALTER COLUMN billing_email TYPE VARCHAR(512),
    ALTER COLUMN emergency_contact_name TYPE VARCHAR(512),
    ALTER COLUMN emergency_contact_phone TYPE VARCHAR(512);

ALTER TABLE provider_profiles
    ALTER COLUMN tax_or_id_number TYPE VARCHAR(512),
    ALTER COLUMN flight_license_number TYPE VARCHAR(512),
    ALTER COLUMN bank_account_number TYPE VARCHAR(512),
    ALTER COLUMN bank_account_holder TYPE VARCHAR(512),
    ALTER COLUMN contact_phone TYPE VARCHAR(512);
