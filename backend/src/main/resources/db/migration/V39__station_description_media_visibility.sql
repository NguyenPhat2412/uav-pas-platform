-- BA 10.2: a station keeps operational notes.
ALTER TABLE uav_stations ADD COLUMN IF NOT EXISTS description VARCHAR(500);

-- BA 13.4: PRIVATE (default), PROTECTED or PUBLIC; existing files stay PRIVATE.
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS media_assets_visibility_check;
ALTER TABLE media_assets ADD CONSTRAINT media_assets_visibility_check
    CHECK (visibility IN ('PRIVATE', 'PROTECTED', 'PUBLIC'));
