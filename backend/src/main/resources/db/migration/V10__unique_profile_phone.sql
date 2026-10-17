-- Preserve the existing registration rule when profile edits and registration race.
-- Deliberately fail on legacy duplicates; never silently reassign personal data.
-- Blank and absent values remain allowed for imported/OAuth accounts.
CREATE UNIQUE INDEX uk_users_phone_number ON users (btrim(phone_number))
    WHERE phone_number IS NOT NULL AND btrim(phone_number) <> '';
