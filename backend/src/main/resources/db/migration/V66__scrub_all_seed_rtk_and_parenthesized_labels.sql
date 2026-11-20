-- ==============================================================================
-- V66__scrub_all_seed_rtk_and_parenthesized_labels.sql
-- Root-level database scrub across all seeded & operational tables:
--   1. Normalize "(minh hoạ)" / "(dữ liệu minh hoạ)" / "(giá minh hoạ)" -> "— minh hoạ"
--   2. Scrub legacy "RTK" and centimeter accuracy strings -> "GNSS" / general survey wording
-- ==============================================================================

-- 1. Normalize parenthesized illustrative suffixes across marketplace, project, fleet & user rows
UPDATE service_plans
SET name = REPLACE(name, ' (minh hoạ)', ' — minh hoạ'),
    description = REPLACE(description, ' (minh hoạ)', ' — minh hoạ')
WHERE name LIKE '%(minh hoạ)%' OR description LIKE '%(minh hoạ)%';

UPDATE users
SET full_name = REPLACE(full_name, ' (minh hoạ)', ' — minh hoạ')
WHERE full_name LIKE '%(minh hoạ)%';

UPDATE provider_profiles
SET display_name = REPLACE(display_name, ' (minh hoạ)', ' — minh hoạ'),
    bio = REPLACE(REPLACE(COALESCE(bio, ''), ' (dữ liệu minh hoạ)', ' — dữ liệu minh hoạ'), ' (minh hoạ)', ' — minh hoạ')
WHERE display_name LIKE '%(minh hoạ)%' OR bio LIKE '%minh hoạ)%';

UPDATE provider_pilots
SET full_name = REPLACE(full_name, ' (minh hoạ)', ' — minh hoạ')
WHERE full_name LIKE '%(minh hoạ)%';

UPDATE uavs
SET model = REPLACE(REPLACE(model, ' (minh hoạ)', ' — minh hoạ'), 'RTK', 'GNSS')
WHERE model LIKE '%(minh hoạ)%' OR model LIKE '%RTK%';

UPDATE projects
SET name = REPLACE(name, ' (minh hoạ)', ' — minh hoạ'),
    note = REPLACE(COALESCE(note, ''), ' (minh hoạ)', ' — minh hoạ')
WHERE name LIKE '%(minh hoạ)%' OR note LIKE '%(minh hoạ)%';

UPDATE marketplace_listings
SET title = REPLACE(REPLACE(title, ' (minh hoạ)', ' — minh hoạ'), 'RTK', 'GNSS'),
    summary = REPLACE(REPLACE(REPLACE(COALESCE(summary, ''), ' (giá minh hoạ)', ' — giá minh hoạ'), ' (dữ liệu minh hoạ)', ' — dữ liệu minh hoạ'), ' (minh hoạ)', ' — minh hoạ'),
    description = REPLACE(REPLACE(COALESCE(description, ''), ' (dữ liệu minh hoạ)', ' — dữ liệu minh hoạ'), ' (minh hoạ)', ' — minh hoạ'),
    equipment_specs = REPLACE(REPLACE(COALESCE(equipment_specs, ''), ' (minh hoạ)', ' — minh hoạ'), 'RTK', 'GNSS'),
    deliverables_summary = REPLACE(REPLACE(COALESCE(deliverables_summary, ''), ' (minh hoạ)', ' — minh hoạ'), 'RTK', 'GNSS')
WHERE title LIKE '%(minh hoạ)%'
   OR title LIKE '%RTK%'
   OR summary LIKE '%minh hoạ)%'
   OR description LIKE '%minh hoạ)%'
   OR equipment_specs LIKE '%(minh hoạ)%'
   OR equipment_specs LIKE '%RTK%'
   OR deliverables_summary LIKE '%(minh hoạ)%'
   OR deliverables_summary LIKE '%RTK%';

UPDATE missions
SET title = REPLACE(REPLACE(title, ' (minh hoạ)', ' — minh hoạ'), 'RTK', 'GNSS')
WHERE title LIKE '%(minh hoạ)%' OR title LIKE '%RTK%';

-- 2. Scrub legacy RTK & centimeter claims in training_documents, simulation_run_logs, support_quick_replies, uav_services, media_assets
UPDATE uav_services
SET name = REPLACE(name, 'RTK', 'GNSS'),
    description = REPLACE(COALESCE(description, ''), 'RTK', 'GNSS'),
    sensors = REPLACE(COALESCE(sensors, ''), 'RTK', 'GNSS')
WHERE name LIKE '%RTK%' OR description LIKE '%RTK%' OR sensors LIKE '%RTK%';

UPDATE media_assets
SET original_name = REPLACE(original_name, 'RTK', 'GNSS')
WHERE original_name LIKE '%RTK%';

UPDATE simulation_run_logs
SET uav_code = REPLACE(uav_code, 'RTK', 'GNSS'),
    outcome_summary = REPLACE(COALESCE(outcome_summary, ''), 'RTK', 'GNSS')
WHERE uav_code LIKE '%RTK%' OR outcome_summary LIKE '%RTK%';

UPDATE support_quick_replies
SET content = 'Chào {name}, với nhu cầu khảo sát bản đồ GIS / bình đồ 2D-3D, nền tảng UAV PAS kết nối các đội bay sử dụng định vị GNSS đa hệ. Bạn có thể tạo dự án và vẽ vùng bay để nhận phương án phù hợp.'
WHERE topic = 'SURVEY_SERVICE' AND content LIKE '%RTK%';

UPDATE training_documents
SET title = REPLACE(title, 'RTK', 'GNSS'),
    summary = REPLACE(summary, 'RTK', 'GNSS'),
    content_markdown = REPLACE(REPLACE(content_markdown, 'GNSS/RTK', 'GNSS'), 'RTK', 'GNSS'),
    checklist_json = REPLACE(REPLACE(checklist_json, 'GNSS/RTK', 'GNSS'), 'RTK', 'GNSS')
WHERE title LIKE '%RTK%'
   OR summary LIKE '%RTK%'
   OR content_markdown LIKE '%RTK%'
   OR checklist_json LIKE '%RTK%';
