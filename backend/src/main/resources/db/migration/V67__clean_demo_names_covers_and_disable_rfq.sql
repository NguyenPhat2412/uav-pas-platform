-- ==============================================================================
-- V67__clean_demo_names_covers_and_disable_rfq.sql
-- Root-level cleanup for UI-REVIEW-9-FIXES & WEBSITE-REDESIGN (S0):
--   1. Strip trailing illustrative markers ("— minh hoạ", "– minh hoạ",
--      "- minh hoạ", "(minh hoạ)", "· minh hoạ", "minh hoạ" / "minh họa")
--      from entity display names only (listings, UAVs, demo users, pilots,
--      projects, provider profiles, service plans, missions). Long descriptions
--      (summary, description, bio, note) are preserved.
--   2. Scrub banned third-party-logo cover URLs (usgs-*, data-collection-corridor,
--      managed-ops-command, step-01-select-service) to NULL and assign a unique
--      verified clean cover_image_url to each seeded demo listing (NULL if none left).
--   3. Disable Open RFQ by default (`marketplace.rfq_enabled = 'false'`) without
--      deleting any RFQ backend code.
-- ==============================================================================

-- 1. Clean entity names (idempotent: only updates rows that actually change)
UPDATE marketplace_listings
SET title = TRIM(REGEXP_REPLACE(TRIM(title), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i')),
    updated_at = CURRENT_TIMESTAMP
WHERE (LOWER(title) LIKE '%minh hoạ%' OR LOWER(title) LIKE '%minh họa%' OR LOWER(title) LIKE '%minh hoa%')
  AND title <> TRIM(REGEXP_REPLACE(TRIM(title), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i'));

UPDATE uavs
SET model = TRIM(REGEXP_REPLACE(TRIM(model), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i')),
    updated_at = CURRENT_TIMESTAMP
WHERE (LOWER(model) LIKE '%minh hoạ%' OR LOWER(model) LIKE '%minh họa%' OR LOWER(model) LIKE '%minh hoa%')
  AND model <> TRIM(REGEXP_REPLACE(TRIM(model), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i'));

UPDATE users
SET full_name = TRIM(REGEXP_REPLACE(TRIM(full_name), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i')),
    updated_at = CURRENT_TIMESTAMP
WHERE full_name IS NOT NULL
  AND (LOWER(full_name) LIKE '%minh hoạ%' OR LOWER(full_name) LIKE '%minh họa%' OR LOWER(full_name) LIKE '%minh hoa%')
  AND full_name <> TRIM(REGEXP_REPLACE(TRIM(full_name), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i'));

UPDATE provider_pilots
SET full_name = TRIM(REGEXP_REPLACE(TRIM(full_name), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i')),
    updated_at = CURRENT_TIMESTAMP
WHERE (LOWER(full_name) LIKE '%minh hoạ%' OR LOWER(full_name) LIKE '%minh họa%' OR LOWER(full_name) LIKE '%minh hoa%')
  AND full_name <> TRIM(REGEXP_REPLACE(TRIM(full_name), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i'));

UPDATE projects
SET name = TRIM(REGEXP_REPLACE(TRIM(name), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i')),
    updated_at = CURRENT_TIMESTAMP
WHERE (LOWER(name) LIKE '%minh hoạ%' OR LOWER(name) LIKE '%minh họa%' OR LOWER(name) LIKE '%minh hoa%')
  AND name <> TRIM(REGEXP_REPLACE(TRIM(name), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i'));

UPDATE provider_profiles
SET display_name = TRIM(REGEXP_REPLACE(TRIM(display_name), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i')),
    updated_at = CURRENT_TIMESTAMP
WHERE (LOWER(display_name) LIKE '%minh hoạ%' OR LOWER(display_name) LIKE '%minh họa%' OR LOWER(display_name) LIKE '%minh hoa%')
  AND display_name <> TRIM(REGEXP_REPLACE(TRIM(display_name), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i'));

UPDATE service_plans
SET name = TRIM(REGEXP_REPLACE(TRIM(name), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i')),
    updated_at = CURRENT_TIMESTAMP
WHERE (LOWER(name) LIKE '%minh hoạ%' OR LOWER(name) LIKE '%minh họa%' OR LOWER(name) LIKE '%minh hoa%')
  AND name <> TRIM(REGEXP_REPLACE(TRIM(name), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i'));

UPDATE missions
SET title = TRIM(REGEXP_REPLACE(TRIM(title), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i')),
    updated_at = CURRENT_TIMESTAMP
WHERE (LOWER(title) LIKE '%minh hoạ%' OR LOWER(title) LIKE '%minh họa%' OR LOWER(title) LIKE '%minh hoa%')
  AND title <> TRIM(REGEXP_REPLACE(TRIM(title), '(\s*(—|–|-|·)?\s*\(?\s*minh\s+h[oọ][aạ]\s*\)?\.?)+$', '', 'i'));

-- 2. Scrub any banned third-party-logo cover URLs to NULL
UPDATE marketplace_listings
SET cover_image_url = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE cover_image_url IS NOT NULL
  AND (
       LOWER(cover_image_url) LIKE '%usgs%'
    OR LOWER(cover_image_url) LIKE '%data-collection-corridor%'
    OR LOWER(cover_image_url) LIKE '%managed-ops-command%'
    OR LOWER(cover_image_url) LIKE '%step-01-select-service%'
  );

-- Assign distinct verified logo-free cover_image_url values to each demo listing
UPDATE marketplace_listings
SET cover_image_url = '/images/process/step-05-data-handover.webp',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'khao-sat-ban-do-2d-du-an-minh-hoa'
  AND (cover_image_url IS NULL OR cover_image_url LIKE '/images/%')
  AND COALESCE(cover_image_url, '') <> '/images/process/step-05-data-handover.webp';

UPDATE marketplace_listings
SET cover_image_url = '/images/services/aerial-inspection-grid.webp',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'kiem-tra-nhiet-dien-mat-troi-minh-hoa'
  AND (cover_image_url IS NULL OR cover_image_url LIKE '/images/%')
  AND COALESCE(cover_image_url, '') <> '/images/services/aerial-inspection-grid.webp';

UPDATE marketplace_listings
SET cover_image_url = '/images/services/aerial-recording-cinema.webp',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'quay-phim-tien-do-cong-trinh-4k-minh-hoa'
  AND (cover_image_url IS NULL OR cover_image_url LIKE '/images/%')
  AND COALESCE(cover_image_url, '') <> '/images/services/aerial-recording-cinema.webp';

UPDATE marketplace_listings
SET cover_image_url = '/images/solutions/edge-ai-kv260-tracking.webp',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'danh-gia-chi-so-cay-trong-da-pho-minh-hoa'
  AND (cover_image_url IS NULL OR cover_image_url LIKE '/images/%')
  AND COALESCE(cover_image_url, '') <> '/images/solutions/edge-ai-kv260-tracking.webp';

UPDATE marketplace_listings
SET cover_image_url = '/images/solutions/sar-emergency-response.webp',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'kiem-tra-hanh-lang-cau-cang-ha-tang-minh-hoa'
  AND (cover_image_url IS NULL OR cover_image_url LIKE '/images/%')
  AND COALESCE(cover_image_url, '') <> '/images/solutions/sar-emergency-response.webp';

UPDATE marketplace_listings
SET cover_image_url = '/images/solutions/infra-3d-survey.webp',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'mo-hinh-3d-hien-trang-quy-hoach-minh-hoa'
  AND (cover_image_url IS NULL OR cover_image_url LIKE '/images/%')
  AND COALESCE(cover_image_url, '') <> '/images/solutions/infra-3d-survey.webp';

UPDATE marketplace_listings
SET cover_image_url = '/images/services/uav-rental-fleet.webp',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'uav-rental-official'
  AND (cover_image_url IS NULL OR cover_image_url LIKE '/images/%')
  AND COALESCE(cover_image_url, '') <> '/images/services/uav-rental-fleet.webp';

-- 3. Disable Open RFQ by default in system_configurations (keep RFQ code intact)
UPDATE system_configurations
SET config_value = 'false',
    description = 'Cho phép mở yêu cầu báo giá mở (ngoài phạm vi đồ án, mặc định tắt)',
    updated_by = 'SYSTEM',
    updated_at = CURRENT_TIMESTAMP
WHERE config_key = 'marketplace.rfq_enabled'
  AND LOWER(COALESCE(config_value, '')) <> 'false';

INSERT INTO system_configurations
    (config_key, config_value, category, description, updated_by, value_type, min_value, max_value, is_public, created_at, updated_at)
SELECT
    'marketplace.rfq_enabled',
    'false',
    'MARKETPLACE',
    'Cho phép mở yêu cầu báo giá mở (ngoài phạm vi đồ án, mặc định tắt)',
    'SYSTEM',
    'BOOLEAN',
    NULL,
    NULL,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM system_configurations WHERE config_key = 'marketplace.rfq_enabled'
);
