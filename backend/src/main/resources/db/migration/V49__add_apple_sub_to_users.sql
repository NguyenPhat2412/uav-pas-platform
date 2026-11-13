-- Sign in with Apple: persistent Apple user identifier (sub claim) bound to an account.
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_sub VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS uk_users_apple_sub
    ON users (apple_sub)
    WHERE apple_sub IS NOT NULL;
