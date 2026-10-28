-- Map & GIS system settings exposed to portals and map components via GET /api/v1/public/site-info
INSERT INTO system_configurations
    (config_key, config_value, category, description, updated_by, value_type, min_value, max_value, allowed_values, is_public)
VALUES
('map.default_basemap', 'streets', 'MAP', 'Lớp bản đồ nền mặc định trên toàn hệ thống (streets, satellite, terrain, dark)', 'SYSTEM', 'ENUM', NULL, NULL, 'streets,satellite,terrain,dark', TRUE),
('map.default_center_lat', '21.0136', 'MAP', 'Vĩ độ tâm bản đồ mặc định khi khởi tạo (Khu CNC Hòa Lạc - VJU)', 'SYSTEM', 'DECIMAL', -90, 90, NULL, TRUE),
('map.default_center_lng', '105.5259', 'MAP', 'Kinh độ tâm bản đồ mặc định khi khởi tạo (Khu CNC Hòa Lạc - VJU)', 'SYSTEM', 'DECIMAL', -180, 180, NULL, TRUE),
('map.default_zoom', '12', 'MAP', 'Mức thu phóng (Zoom) mặc định khi mở bản đồ (4 - 19)', 'SYSTEM', 'INTEGER', 4, 19, NULL, TRUE),
('map.show_scale_bar', 'true', 'MAP', 'Hiển thị thước tỷ lệ khoảng cách (Scale Bar) trên các bản đồ', 'SYSTEM', 'BOOLEAN', NULL, NULL, NULL, TRUE),
('map.show_station_radius', 'true', 'MAP', 'Hiển thị vòng bán kính phủ sóng của các trạm căn cứ UAV trên Bản đồ đội bay', 'SYSTEM', 'BOOLEAN', NULL, NULL, NULL, TRUE),
('map.station_coverage_radius_m', '5000', 'MAP', 'Bán kính vùng phủ sóng mặc định của trạm căn cứ UAV (mét)', 'SYSTEM', 'INTEGER', 500, 50000, NULL, TRUE)
ON CONFLICT (config_key) DO NOTHING;
