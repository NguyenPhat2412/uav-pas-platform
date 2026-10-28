-- Payment account and VAT settings editable from the admin settings page.
-- An empty value means "use the environment property" (app.billing.*), so existing deployments
-- keep their configured bank account until an operator explicitly overrides it here.
-- billing.vat_rate is a fraction in [0, 1] (0.10 = 10%), matching app.billing.vat-rate.
INSERT INTO system_configurations (config_key, config_value, category, description, updated_by)
VALUES
('billing.bank_bin', '', 'BILLING', 'Mã BIN ngân hàng nhận chuyển khoản (6 chữ số, NAPAS). Để trống để dùng biến môi trường', 'SYSTEM'),
('billing.bank_name', '', 'BILLING', 'Tên ngân hàng nhận chuyển khoản. Để trống để dùng biến môi trường', 'SYSTEM'),
('billing.bank_account_number', '', 'BILLING', 'Số tài khoản nhận chuyển khoản. Để trống để dùng biến môi trường', 'SYSTEM'),
('billing.bank_account_name', '', 'BILLING', 'Tên chủ tài khoản nhận chuyển khoản. Để trống để dùng biến môi trường', 'SYSTEM'),
('billing.vat_rate', '', 'BILLING', 'Thuế suất VAT dạng phân số từ 0 đến 1 (0.10 = 10%). Để trống để dùng biến môi trường', 'SYSTEM')
ON CONFLICT (config_key) DO NOTHING;
