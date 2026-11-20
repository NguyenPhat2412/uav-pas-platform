-- ==============================================================================
-- V63__seed_demo_marketplace_and_clean_copy.sql
-- 1. Scrub restricted wording from DB rows (content-guard compliance)
-- 2. Seed illustrative demo data: 2 verified fleets (one with 10 UAVs + 2 pilots),
--    6 published listings, and 1 demo customer with 1 active project — all labeled "minh hoạ"
-- ==============================================================================

-- 1. Scrub restricted terms from service_plans, provider_profiles, and marketplace_listings
UPDATE service_plans
SET name = 'Gói Cơ bản — minh hoạ',
    description = 'Công cụ quản lý dự án, lập vùng bay GIS cơ bản, kiểm tra không phận/thời tiết và đối soát minh hoạ.'
WHERE code = 'BASIC';

UPDATE service_plans
SET name = 'Gói Chuyên nghiệp — minh hoạ',
    description = 'Mở rộng hạn mức điều phối dự án, theo dõi đường bay mô phỏng trực tuyến, chỉ số pin và báo cáo kiểm tra số minh hoạ.'
WHERE code = 'PRO';

UPDATE service_plans
SET name = 'Gói Tổ chức — minh hoạ',
    description = 'Quản trị phân quyền đội ngũ, điều phối tập trung nhiều dự án, lưu trữ dữ liệu đám mây và kết nối tích hợp minh hoạ.'
WHERE code = 'ENTERPRISE';

UPDATE provider_profiles
SET bio = REPLACE(REPLACE(COALESCE(bio, ''), 'RTK', 'định vị GNSS'), 'SLA', 'tiến độ')
WHERE bio LIKE '%RTK%' OR bio LIKE '%SLA%';

UPDATE marketplace_listings
SET title = REPLACE(REPLACE(title, 'RTK', 'GNSS'), 'Chính hãng', 'minh hoạ'),
    summary = REPLACE(REPLACE(COALESCE(summary, ''), 'RTK', 'định vị GNSS'), 'SLA', 'tiến độ'),
    description = REPLACE(REPLACE(COALESCE(description, ''), 'RTK', 'định vị GNSS'), 'SLA', 'tiến độ'),
    equipment_specs = REPLACE(COALESCE(equipment_specs, ''), 'RTK', 'cảm biến quang học'),
    deliverables_summary = REPLACE(COALESCE(deliverables_summary, ''), 'RTK', 'toạ độ GNSS')
WHERE title LIKE '%RTK%'
   OR title LIKE '%Chính hãng%'
   OR summary LIKE '%RTK%'
   OR summary LIKE '%SLA%'
   OR description LIKE '%RTK%'
   OR description LIKE '%SLA%'
   OR equipment_specs LIKE '%RTK%'
   OR deliverables_summary LIKE '%RTK%';

-- 2. Seed 2 Demo Fleets (Fleet 1 with 10 UAVs, Fleet 2 with 2 UAVs) + 1 Demo Customer
INSERT INTO users (username, email, password_hash, full_name, phone_number, role, status, email_verified, failed_attempts, manual_locked, created_at, updated_at)
VALUES
    ('demo_fleet', 'demo.fleet@gmail.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5L3s2W0p8tG5Q7r0nQ4Y6s8m9K1a2', 'Chủ đội bay Miền Nam — minh hoạ', '0909100201', 'ROLE_PILOT', 'ACTIVE', TRUE, 0, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('demo_fleet_north', 'demo.fleet.north@gmail.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5L3s2W0p8tG5Q7r0nQ4Y6s8m9K1a2', 'Chủ đội bay Miền Bắc — minh hoạ', '0909100202', 'ROLE_PILOT', 'ACTIVE', TRUE, 0, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('demo_customer', 'demo.customer@gmail.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5L3s2W0p8tG5Q7r0nQ4Y6s8m9K1a2', 'Khách hàng Dự án — minh hoạ', '0909100203', 'ROLE_PILOT', 'ACTIVE', TRUE, 0, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

INSERT INTO provider_profiles (
    user_id, slug, display_name, provider_type, tax_or_id_number, flight_license_number,
    bio, province, service_radius_km, contact_phone, bank_name, bank_account_number, bank_account_holder,
    verification_status, verified_at, verified_by, rating_avg, review_count, completed_missions_count,
    created_at, updated_at
)
SELECT
    u.id,
    'doi-bay-mien-nam-minh-hoa',
    'Đội bay Khảo sát Miền Nam — minh hoạ',
    'COMPANY',
    '0319001100',
    'GP-BAY-DEMO-01',
    'Đội bay khảo sát hạ tầng và nông nghiệp quy mô 10 thiết bị bay — dữ liệu minh hoạ.',
    'TP. Hồ Chí Minh',
    300,
    '0909100201',
    'Vietcombank',
    '0071000011223',
    'DOI BAY MIEN NAM MINH HOA',
    'VERIFIED',
    CURRENT_TIMESTAMP,
    'SYSTEM',
    4.90,
    24,
    58,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE u.username = 'demo_fleet'
  AND NOT EXISTS (SELECT 1 FROM provider_profiles p WHERE p.user_id = u.id);

INSERT INTO provider_profiles (
    user_id, slug, display_name, provider_type, tax_or_id_number, flight_license_number,
    bio, province, service_radius_km, contact_phone, bank_name, bank_account_number, bank_account_holder,
    verification_status, verified_at, verified_by, rating_avg, review_count, completed_missions_count,
    created_at, updated_at
)
SELECT
    u.id,
    'doi-bay-mien-bac-minh-hoa',
    'Đội bay Bản đồ Miền Bắc — minh hoạ',
    'COMPANY',
    '0109002200',
    'GP-BAY-DEMO-02',
    'Đội bay đo đạc bản đồ địa hình và ghi hình công trình tại khu vực phía Bắc — dữ liệu minh hoạ.',
    'Hà Nội',
    300,
    '0909100202',
    'Techcombank',
    '1903000022334',
    'DOI BAY MIEN BAC MINH HOA',
    'VERIFIED',
    CURRENT_TIMESTAMP,
    'SYSTEM',
    4.80,
    16,
    41,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE u.username = 'demo_fleet_north'
  AND NOT EXISTS (SELECT 1 FROM provider_profiles p WHERE p.user_id = u.id);

-- 3. Seed 10 UAVs for Fleet 1 (demo_fleet) + 2 UAVs for Fleet 2
INSERT INTO uavs (model, serial_number, manufacturer, status, provider_id, created_at, updated_at)
SELECT v.model, v.sn, v.mfg, 'AVAILABLE', p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM provider_profiles p
JOIN (
    SELECT 'Matrice 350 Survey — minh hoạ' AS model, 'DEMO-SGN-UAV-01' AS sn, 'DJI' AS mfg
    UNION ALL SELECT 'Matrice 350 Survey — minh hoạ', 'DEMO-SGN-UAV-02', 'DJI'
    UNION ALL SELECT 'Mavic 3 Enterprise — minh hoạ', 'DEMO-SGN-UAV-03', 'DJI'
    UNION ALL SELECT 'Mavic 3 Enterprise — minh hoạ', 'DEMO-SGN-UAV-04', 'DJI'
    UNION ALL SELECT 'Mavic 3 Multispectral — minh hoạ', 'DEMO-SGN-UAV-05', 'DJI'
    UNION ALL SELECT 'Mavic 3 Multispectral — minh hoạ', 'DEMO-SGN-UAV-06', 'DJI'
    UNION ALL SELECT 'Mavic 3 Thermal — minh hoạ', 'DEMO-SGN-UAV-07', 'DJI'
    UNION ALL SELECT 'Mavic 3 Thermal — minh hoạ', 'DEMO-SGN-UAV-08', 'DJI'
    UNION ALL SELECT 'Inspire 3 Cinema — minh hoạ', 'DEMO-SGN-UAV-09', 'DJI'
    UNION ALL SELECT 'Agras T50 Spray — minh hoạ', 'DEMO-SGN-UAV-10', 'DJI'
) v ON 1 = 1
WHERE p.slug = 'doi-bay-mien-nam-minh-hoa'
  AND NOT EXISTS (SELECT 1 FROM uavs u WHERE u.serial_number = v.sn);

INSERT INTO uavs (model, serial_number, manufacturer, status, provider_id, created_at, updated_at)
SELECT v.model, v.sn, v.mfg, 'AVAILABLE', p.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM provider_profiles p
JOIN (
    SELECT 'Matrice 350 Survey — minh hoạ' AS model, 'DEMO-HAN-UAV-01' AS sn, 'DJI' AS mfg
    UNION ALL SELECT 'Mavic 3 Thermal — minh hoạ', 'DEMO-HAN-UAV-02', 'DJI'
) v ON 1 = 1
WHERE p.slug = 'doi-bay-mien-bac-minh-hoa'
  AND NOT EXISTS (SELECT 1 FROM uavs u WHERE u.serial_number = v.sn);

-- 4. Seed 2 Pilots for Fleet 1
INSERT INTO provider_pilots (provider_id, pilot_user_id, full_name, email, phone, license_number, specialization, pilot_status, deleted, created_at, updated_at)
SELECT p.id, p.user_id, 'Kỹ sư Trần Minh Quân — minh hoạ', 'pilot1.demo@uav.local', '0909300101', 'CC-BAY-DEMO-101', 'Khảo sát bản đồ & mô hình 3D', 'AVAILABLE', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM provider_profiles p
WHERE p.slug = 'doi-bay-mien-nam-minh-hoa'
  AND NOT EXISTS (SELECT 1 FROM provider_pilots pp WHERE pp.provider_id = p.id AND pp.license_number = 'CC-BAY-DEMO-101');

INSERT INTO provider_pilots (provider_id, pilot_user_id, full_name, email, phone, license_number, specialization, pilot_status, deleted, created_at, updated_at)
SELECT p.id, p.user_id, 'Kỹ sư Lê Hoàng Hải — minh hoạ', 'pilot2.demo@uav.local', '0909300102', 'CC-BAY-DEMO-102', 'Kiểm tra nhiệt hạ tầng & điện mặt trời', 'AVAILABLE', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM provider_profiles p
WHERE p.slug = 'doi-bay-mien-nam-minh-hoa'
  AND NOT EXISTS (SELECT 1 FROM provider_pilots pp WHERE pp.provider_id = p.id AND pp.license_number = 'CC-BAY-DEMO-102');

-- 5. Seed 6 Published Demo Listings (explicitly labeled "minh hoạ")
INSERT INTO marketplace_listings (
    provider_id, slug, title, summary, description, listing_type, mission_type, pricing_model,
    base_price_vnd, min_booking_units, security_deposit_vnd, province, service_radius_km,
    equipment_specs, deliverables_summary, on_site_sla_hours, delivery_sla_hours,
    moderation_status, moderated_by, moderated_at, rating_avg, review_count, booking_count, featured, deleted,
    created_at, updated_at
)
SELECT
    p.id,
    v.slug,
    v.title,
    v.summary,
    v.description,
    v.ltype,
    v.mtype,
    v.pmodel,
    v.price,
    v.min_units,
    0,
    v.province,
    250,
    v.specs,
    v.deliverables,
    24,
    48,
    'PUBLISHED',
    'SYSTEM',
    CURRENT_TIMESTAMP,
    v.rating,
    v.reviews,
    v.bookings,
    TRUE,
    FALSE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT 'doi-bay-mien-nam-minh-hoa' AS pslug, 'khao-sat-ban-do-2d-du-an-minh-hoa' AS slug, 'Khảo sát bản đồ trực giao 2D khu đất dự án — minh hoạ' AS title, 'Chụp ảnh lập thể và ghép bình đồ tiến độ san lấp mặt bằng theo dự án — giá minh hoạ.' AS summary, 'Dịch vụ khảo sát tổng quan khu đất xây dựng, khu công nghiệp theo lịch một lần hoặc định kỳ hàng tuần — dữ liệu minh hoạ.' AS description, 'FLIGHT_SERVICE' AS ltype, 'DATA_COLLECTION' AS mtype, 'PER_HECTARE' AS pmodel, 450000 AS price, 5 AS min_units, 'TP. Hồ Chí Minh' AS province, 'Tàu bay khảo sát cảm biến quang học độ phân giải cao' AS specs, 'Bình đồ ghép ảnh GeoTIFF và báo cáo tổng hợp PDF — minh hoạ' AS deliverables, 4.90 AS rating, 14 AS reviews, 32 AS bookings
    UNION ALL SELECT 'doi-bay-mien-nam-minh-hoa', 'kiem-tra-nhiet-dien-mat-troi-minh-hoa', 'Kiểm tra ảnh nhiệt áp mái điện mặt trời — minh hoạ', 'Phát hiện tấm pin quá nhiệt và hư hỏng bề mặt nhà xưởng — giá minh hoạ.', 'Bay quét cảm biến nhiệt toàn bộ mái nhà máy điện mặt trời theo từng phân khu dự án — dữ liệu minh hoạ.', 'FLIGHT_SERVICE', 'AREA_INSPECTION', 'PER_PACKAGE', 3800000, 1, 'Bình Dương', 'Tàu bay gắn camera nhiệt bức xạ và ống kính zoom quang học', 'Bản đồ điểm nóng và danh mục vị trí cần bảo trì — minh hoạ', 4.85, 11, 25
    UNION ALL SELECT 'doi-bay-mien-nam-minh-hoa', 'quay-phim-tien-do-cong-trinh-4k-minh-hoa', 'Ghi hình 4K theo dõi tiến độ công trình định kỳ — minh hoạ', 'Ghi hình góc cao toàn cảnh công trường xây dựng hàng tuần/tháng — giá minh hoạ.', 'Thực hiện lộ trình bay cố định qua các mốc dự án để đối chiếu tiến độ thi công trực quan — dữ liệu minh hoạ.', 'FLIGHT_SERVICE', 'AERIAL_RECORDING', 'PER_HOUR', 2400000, 2, 'TP. Hồ Chí Minh', 'Tàu bay ghi hình 4K chống rung 3 trục', 'Bộ video 4K và ảnh toàn cảnh phân loại theo ngày bay — minh hoạ', 4.95, 18, 44
    UNION ALL SELECT 'doi-bay-mien-nam-minh-hoa', 'danh-gia-chi-so-cay-trong-da-pho-minh-hoa', 'Phân tích sức khoẻ cây trồng bằng ảnh đa phổ — minh hoạ', 'Đánh giá mật độ sinh trưởng và vùng thiếu nước cho nông trại lớn — giá minh hoạ.', 'Thu thập dữ liệu phổ thực vật cho vùng canh tác nông nghiệp theo chu kỳ sinh trưởng — dữ liệu minh hoạ.', 'FLIGHT_SERVICE', 'DATA_COLLECTION', 'PER_HECTARE', 320000, 10, 'Đồng Nai', 'Tàu bay cảm biến đa phổ 4 dải sóng nông nghiệp', 'Bản đồ phân vùng sinh trưởng và khuyến nghị chăm sóc — minh hoạ', 4.80, 9, 19
    UNION ALL SELECT 'doi-bay-mien-bac-minh-hoa', 'kiem-tra-hanh-lang-cau-cang-ha-tang-minh-hoa', 'Kiểm tra trực quan dầm cầu, tháp cao và hạ tầng — minh hoạ', 'Chụp cận cảnh chi tiết kết cấu khó tiếp cận không cần giàn giáo — giá minh hoạ.', 'Bay kiểm tra an toàn kết cấu cầu đường, trạm viễn thông và khu công nghiệp miền Bắc — dữ liệu minh hoạ.', 'FLIGHT_SERVICE', 'AREA_INSPECTION', 'PER_HOUR', 2900000, 2, 'Hà Nội', 'Tàu bay kiểm tra công nghiệp tích hợp zoom quang học', 'Bộ ảnh chi tiết đánh dấu toạ độ từng hạng mục kiểm tra — minh hoạ', 4.85, 12, 28
    UNION ALL SELECT 'doi-bay-mien-bac-minh-hoa', 'mo-hinh-3d-hien-trang-quy-hoach-minh-hoa', 'Dựng mô hình 3D hiện trạng khu quy hoạch đô thị — minh hoạ', 'Bay chụp xiên đa góc phục vụ tái tạo mô hình bề mặt 3D trực quan — giá minh hoạ.', 'Phục vụ chủ đầu tư và đơn vị tư vấn thiết kế theo dõi không gian kiến trúc khu dự án — dữ liệu minh hoạ.', 'FLIGHT_SERVICE', 'DATA_COLLECTION', 'PER_PACKAGE', 5200000, 1, 'Hà Nội', 'Tàu bay khảo sát lập trình đường bay lưới 5 hướng', 'Mô hình 3D trực quan và bình đồ ảnh trực giao — minh hoạ', 4.90, 8, 17
) v
JOIN provider_profiles p ON p.slug = v.pslug
WHERE NOT EXISTS (SELECT 1 FROM marketplace_listings m WHERE m.slug = v.slug);

-- 6. Seed 1 Demo Project for demo_customer
INSERT INTO projects (customer_id, code, name, province, area_geojson, note, status, deleted, created_at, updated_at)
SELECT
    u.id,
    'PRJ-2026-DEMO01',
    'Dự án Khu Đô Thị Sinh Thái Nam Sài Gòn — minh hoạ',
    'TP. Hồ Chí Minh',
    '{"type":"Polygon","coordinates":[[[106.7010,10.7280],[106.7120,10.7280],[106.7120,10.7360],[106.7010,10.7360],[106.7010,10.7280]]]}',
    'Dự án mẫu minh hoạ phục vụ đăng ký gói khảo sát định kỳ trên nền tảng UAV PAS.',
    'ACTIVE',
    FALSE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE u.username = 'demo_customer'
  AND NOT EXISTS (SELECT 1 FROM projects prj WHERE prj.code = 'PRJ-2026-DEMO01');
