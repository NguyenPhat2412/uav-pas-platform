-- ==============================================================================
-- V61__refine_marketplace_documents_and_copy.sql
-- 1. Refine service_plans & system_configurations wording (pure software SaaS &
--    formal partner settlement terminology — no crude "phí hoa hồng sàn")
-- 2. Seed formal legal, flight permit, tax & fee addendum documents for verified
--    providers in provider_documents
-- 3. Refresh system-seeded ui_translations so updated VI/EN/JA catalogs reload cleanly
-- ==============================================================================

UPDATE system_configurations
SET description = 'Tỷ lệ đối soát dịch vụ nền tảng tiêu chuẩn theo Phụ lục Biểu phí Đối tác (0.10 = 10%)'
WHERE config_key = 'marketplace.platform_fee_rate';

UPDATE system_configurations
SET description = 'Tỷ lệ đối soát dịch vụ nền tảng áp dụng theo Phụ lục Đối tác Pro (0.06 = 6%)'
WHERE config_key = 'marketplace.pro_fee_rate';

UPDATE system_configurations
SET description = 'Tỷ lệ đối soát dịch vụ nền tảng áp dụng theo Phụ lục Đối tác Enterprise (0.03 = 3%)'
WHERE config_key = 'marketplace.enterprise_fee_rate';

UPDATE service_plans
SET name = 'Gói Tiêu chuẩn (Basic)',
    description = 'Bộ công cụ phần mềm lập kế hoạch vùng bay GIS, thẩm định vùng trời NFZ, lưu trữ dữ liệu Signed-URL và quản lý nhiệm vụ cơ bản.'
WHERE code = 'BASIC';

UPDATE service_plans
SET name = 'Gói Chuyên nghiệp (Pro)',
    description = 'Phần mềm điều phối đa nhiệm vụ, giám sát Telemetry RTK trực tuyến, phân tích tình trạng pin SOH, mô-đun AI thử nghiệm và báo cáo vận hành.'
WHERE code = 'PRO';

UPDATE service_plans
SET name = 'Gói Tổ chức (Enterprise)',
    description = 'Nền tảng quản trị đa trạm phân quyền RBAC, buồng lái ứng phó SAR chuẩn IAMSAR, lưu trữ đám mây mở rộng và tích hợp Webhook HMAC API.'
WHERE code = 'ENTERPRISE';

-- Seed complete legal, flight permit, fee schedule addendum & tax settlement documents for verified providers
INSERT INTO provider_documents (provider_id, document_type, title, document_number, status, reviewer_note, created_at, updated_at)
SELECT p.id, d.doc_type, d.doc_title, d.doc_num, 'APPROVED', 'Đã đối chiếu bản gốc hồ sơ pháp lý & phụ lục đối soát', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM provider_profiles p
CROSS JOIN (
    VALUES
        ('BUSINESS_LICENSE', 'Giấy chứng nhận đăng ký doanh nghiệp', 'GCN-DN-2026'),
        ('PILOT_CERTIFICATE', 'Chứng chỉ điều khiển phương tiện bay không người lái', 'CAAV-PILOT-2026'),
        ('FLIGHT_OPERATION_PERMIT', 'Văn bản chấp thuận khai thác vùng bay thương mại', 'OPS-PERMIT-2026'),
        ('PLATFORM_FEE_AGREEMENT', 'Bản xác nhận Phụ lục Biểu phí & Quy chế đối soát dịch vụ', 'PL-BP-UAVPAS-2026'),
        ('TAX_SETTLEMENT_DOSSIER', 'Hồ sơ đăng ký mã số thuế & Tài khoản nhận đối soát', 'HS-THUE-DS-2026')
) AS d(doc_type, doc_title, doc_num)
WHERE p.slug IN ('skysurvey-geotech-jsc', 'aerogrid-infrastructure', 'mekong-agro-media-uav')
  AND NOT EXISTS (
      SELECT 1 FROM provider_documents existing
      WHERE existing.provider_id = p.id AND existing.document_type = d.doc_type
  );

-- Refresh system-seeded translations on next startup so refined trilingual wording takes effect immediately
DELETE FROM ui_translations WHERE updated_by = 'SYSTEM';
