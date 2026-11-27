package com.uav.platform.config;

import com.uav.platform.dao.ISystemConfigurationDao;
import com.uav.platform.entity.SystemConfiguration;
import com.uav.platform.enums.SettingValueType;
import com.uav.platform.service.impl.SystemConfigurationOperations;

import lombok.RequiredArgsConstructor;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
public class SystemSettingsDataInitializer implements ApplicationRunner {
    private final ISystemConfigurationDao settings;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seed(
                "marketplace.platform_fee_rate",
                "0.10",
                "MARKETPLACE",
                SettingValueType.DECIMAL,
                new BigDecimal("0.0000"),
                new BigDecimal("0.5000"),
                "Tỷ lệ đối soát dịch vụ nền tảng tiêu chuẩn theo Phụ lục Biểu phí Đối tác (0.00 đến 0.50)");
        seed(
                "marketplace.pro_fee_rate",
                "0.06",
                "MARKETPLACE",
                SettingValueType.DECIMAL,
                new BigDecimal("0.0000"),
                new BigDecimal("0.5000"),
                "Tỷ lệ đối soát dịch vụ nền tảng theo Phụ lục Đối tác gói Pro (0.00 đến 0.50)");
        seed(
                "marketplace.enterprise_fee_rate",
                "0.03",
                "MARKETPLACE",
                SettingValueType.DECIMAL,
                new BigDecimal("0.0000"),
                new BigDecimal("0.5000"),
                "Tỷ lệ đối soát dịch vụ nền tảng theo Phụ lục Đối tác gói Enterprise (0.00 đến 0.50)");
        seed(
                "marketplace.min_payout_vnd",
                "100000",
                "MARKETPLACE",
                SettingValueType.INTEGER,
                BigDecimal.valueOf(50_000L),
                BigDecimal.valueOf(50_000_000L),
                "Hạn mức rút tiền tối thiểu mỗi lần cho Đối tác trên sàn (VNĐ)");
        seed(
                "marketplace.max_payout_vnd",
                "500000000",
                "MARKETPLACE",
                SettingValueType.INTEGER,
                BigDecimal.valueOf(1_000_000L),
                BigDecimal.valueOf(5_000_000_000L),
                "Hạn mức rút tiền tối đa mỗi lệnh cho Đối tác trên sàn (VNĐ)");
        seed(
                "marketplace.default_service_radius_km",
                "100",
                "MARKETPLACE",
                SettingValueType.INTEGER,
                BigDecimal.valueOf(5L),
                BigDecimal.valueOf(2000L),
                "Bán kính phục vụ mặc định khi tạo hồ sơ hoặc tin đăng dịch vụ (km)");
        seed(
                "marketplace.rfq_enabled",
                "false",
                "MARKETPLACE",
                SettingValueType.BOOLEAN,
                null,
                null,
                "Cho phép mở yêu cầu báo giá mở (ngoài phạm vi đồ án, mặc định tắt)");
        seed(
                "marketplace.require_escrow_before_start",
                "false",
                "MARKETPLACE",
                SettingValueType.BOOLEAN,
                null,
                null,
                "Bắt buộc hoàn tất nạp tạm giữ (Escrow) trước khi đối tác bắt đầu bay");
        seed(
                "billing.invoice_due_days",
                "7",
                "BILLING",
                SettingValueType.INTEGER,
                BigDecimal.ONE,
                BigDecimal.valueOf(90L),
                "Số ngày hạn thanh toán mặc định kể từ khi phát hành hóa đơn");
        seedEnum(
                "storage.primary_backend",
                "GOOGLE_DRIVE",
                "STORAGE",
                "GOOGLE_DRIVE,HYBRID_TIERED,R2",
                "Kho lưu trữ mặc định cho tệp mới (GOOGLE_DRIVE, HYBRID_TIERED, R2)");
        seedEnum(
                "storage.allocation_strategy",
                "MOST_FREE_SPACE",
                "STORAGE",
                "MOST_FREE_SPACE,MODULE_PRIORITY,ROUND_ROBIN",
                "Chiến lược phân bổ dung lượng giữa các ổ Google Drive");
        seedPrivate(
                "storage.fallback_to_r2",
                "true",
                "STORAGE",
                SettingValueType.BOOLEAN,
                null,
                null,
                "Tự động dự phòng lưu sang Cloudflare R2 khi chưa kết nối hoặc hết dung lượng Google Drive");
        seedPrivate(
                "storage.tiered_small_file_max_bytes",
                "5242880",
                "STORAGE",
                SettingValueType.INTEGER,
                BigDecimal.valueOf(65_536L),
                BigDecimal.valueOf(104_857_600L),
                "Ngưỡng tệp ảnh nhỏ lưu trên R2 khi dùng chế độ phân tầng HYBRID_TIERED (byte)");
    }

    private void seedEnum(
            String key,
            String defaultValue,
            String category,
            String allowedValues,
            String description) {
        if (settings.findByConfigKey(key).isPresent()) return;
        SystemConfiguration cfg =
                SystemConfigurationOperations.createTyped(
                        key,
                        defaultValue,
                        category,
                        SettingValueType.ENUM,
                        null,
                        null,
                        allowedValues,
                        false);
        cfg.setDescription(description);
        settings.save(cfg);
    }

    private void seedPrivate(
            String key,
            String defaultValue,
            String category,
            SettingValueType type,
            BigDecimal min,
            BigDecimal max,
            String description) {
        if (settings.findByConfigKey(key).isPresent()) return;
        SystemConfiguration cfg =
                SystemConfigurationOperations.createTyped(
                        key, defaultValue, category, type, min, max, null, false);
        cfg.setDescription(description);
        settings.save(cfg);
    }

    private void seed(
            String key,
            String defaultValue,
            String category,
            SettingValueType type,
            BigDecimal min,
            BigDecimal max,
            String description) {
        if (settings.findByConfigKey(key).isPresent()) return;
        SystemConfiguration cfg =
                SystemConfigurationOperations.createTyped(
                        key, defaultValue, category, type, min, max, null, true);
        cfg.setDescription(description);
        settings.save(cfg);
    }
}
