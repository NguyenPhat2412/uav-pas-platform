package com.uav.platform.service.impl.notification.policy;

import com.uav.platform.dao.notification.INotificationModulePolicyDao;
import com.uav.platform.dao.notification.IUserNotificationPreferenceDao;
import com.uav.platform.dto.record.notification.policy.EffectiveNotificationChannels;
import com.uav.platform.dto.response.notification.policy.NotificationModulePolicyResponse;
import com.uav.platform.dto.response.notification.policy.UserNotificationModulePreferenceResponse;
import com.uav.platform.entity.notification.NotificationModulePolicy;
import com.uav.platform.entity.notification.UserNotificationPreference;
import com.uav.platform.enums.notification.NotificationModuleCode;
import com.uav.platform.enums.notification.NotificationSeverity;
import com.uav.platform.enums.notification.NotificationType;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class NotificationPolicyOperations {

    private final INotificationModulePolicyDao policyRepository;
    private final IUserNotificationPreferenceDao preferenceRepository;

    public static NotificationModuleCode resolveModuleCode(
            NotificationType type, String referenceType) {
        String ref = referenceType == null ? "" : referenceType.trim().toUpperCase(Locale.ROOT);
        switch (ref) {
            case "SAR":
                return NotificationModuleCode.SAR;
            case "PERMIT":
            case "AIRSPACE":
                return NotificationModuleCode.AIRSPACE;
            case "MISSION":
                return NotificationModuleCode.MISSION;
            case "MARKETPLACE":
            case "ESCROW":
            case "LISTING":
            case "PAYOUT":
            case "PROVIDER":
            case "RFQ":
                return NotificationModuleCode.MARKETPLACE;
            case "INVOICE":
            case "QUOTA":
            case "BILLING":
            case "PAYMENT":
                return NotificationModuleCode.BILLING;
            case "SUPPORT":
                return NotificationModuleCode.SUPPORT;
            case "MAINTENANCE":
            case "REPAIR":
                return NotificationModuleCode.MAINTENANCE;
            case "STORAGE":
            case "FILE":
            case "DRIVE":
                return NotificationModuleCode.STORAGE;
            default:
                break;
        }
        if (type == null) {
            return NotificationModuleCode.SYSTEM;
        }
        return switch (type) {
            case SAR_TARGET_FOUND -> NotificationModuleCode.SAR;
            case MISSION_ASSIGNED, MISSION_STATUS_CHANGED -> NotificationModuleCode.MISSION;
            case QUOTA_WARNING, PAYMENT -> NotificationModuleCode.BILLING;
            case SYSTEM -> NotificationModuleCode.SYSTEM;
        };
    }

    public static NotificationSeverity defaultSeverity(NotificationModuleCode code) {
        if (code == null) return NotificationSeverity.INFO;
        return switch (code) {
            case SAR, AIRSPACE -> NotificationSeverity.CRITICAL;
            case MISSION, MARKETPLACE, BILLING, SUPPORT -> NotificationSeverity.ACTION;
            case MAINTENANCE, STORAGE, SYSTEM -> NotificationSeverity.INFO;
        };
    }

    public EffectiveNotificationChannels evaluate(
            Long userId, NotificationType type, String referenceType) {
        NotificationModuleCode moduleCode = resolveModuleCode(type, referenceType);
        NotificationModulePolicy policy =
                policyRepository
                        .findByModuleCode(moduleCode)
                        .orElseGet(() -> fallbackPolicy(moduleCode));
        if (!Boolean.TRUE.equals(policy.getEnabled())) {
            return new EffectiveNotificationChannels(
                    moduleCode,
                    policy.getSeverity(),
                    false,
                    Boolean.TRUE.equals(policy.getMandatory()),
                    false,
                    false,
                    false,
                    false,
                    false,
                    0);
        }

        boolean mandatory = Boolean.TRUE.equals(policy.getMandatory());
        UserNotificationPreference pref =
                (mandatory || userId == null)
                        ? null
                        : preferenceRepository
                                .findByUserIdAndModuleCode(userId, moduleCode)
                                .orElse(null);

        boolean userMuted = pref != null && Boolean.TRUE.equals(pref.getMuted());
        boolean inApp = Boolean.TRUE.equals(policy.getInAppEnabled()) && !userMuted;
        boolean screenPopup =
                Boolean.TRUE.equals(policy.getScreenPopupEnabled())
                        && !userMuted
                        && (pref == null || Boolean.TRUE.equals(pref.getScreenPopupEnabled()));
        boolean desktopOs =
                Boolean.TRUE.equals(policy.getDesktopOsEnabled())
                        && !userMuted
                        && (pref == null || Boolean.TRUE.equals(pref.getDesktopOsEnabled()));
        boolean mobilePush =
                Boolean.TRUE.equals(policy.getMobilePushEnabled())
                        && !userMuted
                        && (pref == null || Boolean.TRUE.equals(pref.getMobilePushEnabled()));
        boolean email =
                Boolean.TRUE.equals(policy.getEmailEnabled())
                        && !userMuted
                        && (pref == null || Boolean.TRUE.equals(pref.getEmailEnabled()));

        int cooldown =
                policy.getCooldownSeconds() == null ? 0 : Math.max(0, policy.getCooldownSeconds());
        return new EffectiveNotificationChannels(
                moduleCode,
                policy.getSeverity() != null ? policy.getSeverity() : defaultSeverity(moduleCode),
                true,
                mandatory,
                inApp,
                screenPopup,
                desktopOs,
                mobilePush,
                email,
                cooldown);
    }

    public List<NotificationModulePolicy> ensureAllSeeded() {
        List<NotificationModulePolicy> existing =
                policyRepository.findAllByOrderBySortOrderAscIdAsc();
        Map<NotificationModuleCode, NotificationModulePolicy> byCode =
                new EnumMap<>(NotificationModuleCode.class);
        for (NotificationModulePolicy item : existing) {
            byCode.put(item.getModuleCode(), item);
        }
        List<NotificationModulePolicy> missing = new ArrayList<>();
        for (NotificationModuleCode code : NotificationModuleCode.values()) {
            if (!byCode.containsKey(code)) {
                missing.add(fallbackPolicy(code));
            }
        }
        if (!missing.isEmpty()) {
            policyRepository.saveAll(missing);
            return policyRepository.findAllByOrderBySortOrderAscIdAsc();
        }
        return existing;
    }

    public static NotificationModulePolicy fallbackPolicy(NotificationModuleCode code) {
        NotificationModulePolicy p = new NotificationModulePolicy();
        p.setModuleCode(code);
        p.setSeverity(defaultSeverity(code));
        p.setEnabled(true);
        boolean critical =
                code == NotificationModuleCode.SAR || code == NotificationModuleCode.AIRSPACE;
        p.setMandatory(critical);
        p.setInAppEnabled(true);
        p.setScreenPopupEnabled(true);
        p.setDesktopOsEnabled(
                code != NotificationModuleCode.MAINTENANCE
                        && code != NotificationModuleCode.STORAGE
                        && code != NotificationModuleCode.SYSTEM);
        p.setMobilePushEnabled(
                code != NotificationModuleCode.STORAGE && code != NotificationModuleCode.SYSTEM);
        p.setEmailEnabled(
                critical
                        || code == NotificationModuleCode.MISSION
                        || code == NotificationModuleCode.MARKETPLACE
                        || code == NotificationModuleCode.BILLING);
        p.setCooldownSeconds(0);
        p.setSortOrder((code.ordinal() + 1) * 10);
        switch (code) {
            case SAR -> {
                p.setDisplayNameVi("Tìm kiếm & Cứu nạn (SAR AI)");
                p.setDisplayNameEn("Search & Rescue (SAR AI)");
                p.setDisplayNameJa("捜索救助 (SAR AI)");
                p.setDescriptionVi(
                        "Phát hiện mục tiêu cứu nạn, điều phối khẩn cấp và cảnh báo buồng lái thực địa.");
                p.setDescriptionEn(
                        "Rescue target detections, emergency dispatch, and live field cockpit alerts.");
                p.setDescriptionJa("要救助者の検出、緊急出動指示、現場コックピット警報。");
            }
            case AIRSPACE -> {
                p.setDisplayNameVi("Không phận & Phép bay NFZ");
                p.setDisplayNameEn("Airspace & Flight Permits");
                p.setDisplayNameJa("空域・飛行許可 (NFZ)");
                p.setDescriptionVi(
                        "Cảnh báo vùng cấm bay NFZ, NOTAM tạm thời và trạng thái thẩm định phép bay.");
                p.setDescriptionEn(
                        "No-fly zone alerts, temporary NOTAMs, and flight permit review updates.");
                p.setDescriptionJa("飛行禁止空域警報、一時NOTAM、飛行許可審査ステータス。");
            }
            case MISSION -> {
                p.setDisplayNameVi("Điều phối & Nhiệm vụ bay");
                p.setDisplayNameEn("Flight Missions & Dispatch");
                p.setDisplayNameJa("飛行ミッション・配車");
                p.setDescriptionVi(
                        "Phân công phi công/UAV, thay đổi trạng thái nhiệm vụ và nghiệm thu bàn giao.");
                p.setDescriptionEn(
                        "Operator/UAV assignments, mission lifecycle changes, and handover reviews.");
                p.setDescriptionJa("操縦士・機体割当、ミッション状態変更、引渡し検収。");
            }
            case MARKETPLACE -> {
                p.setDisplayNameVi("Sàn dịch vụ UAV & Ký quỹ Escrow");
                p.setDisplayNameEn("UAV Marketplace & Escrow");
                p.setDisplayNameJa("UAVマーケット・エスクロー");
                p.setDescriptionVi(
                        "Đơn đặt dịch vụ mới, báo giá RFQ, tạm giữ/giải ngân ký quỹ và rút tiền đối tác.");
                p.setDescriptionEn(
                        "New service bookings, RFQ bids, escrow holds/releases, and provider payouts.");
                p.setDescriptionJa("新規予約、RFQ入札、エスクロー保留・解放、パートナー出金。");
            }
            case BILLING -> {
                p.setDisplayNameVi("Hoá đơn, Thanh toán & Hạn mức");
                p.setDisplayNameEn("Billing, Payments & Quotas");
                p.setDisplayNameJa("請求・決済・利用枠");
                p.setDescriptionVi(
                        "Đối soát chuyển khoản VietQR/SePay, phát hành hoá đơn và cảnh báo hạn mức giờ bay.");
                p.setDescriptionEn(
                        "VietQR/SePay payment reconciliation, invoice issuance, and flight-hour quota warnings.");
                p.setDescriptionJa("VietQR/SePay入金消込、請求書発行、飛行時間枠アラート。");
            }
            case SUPPORT -> {
                p.setDisplayNameVi("Hỗ trợ trực tuyến 2 chiều");
                p.setDisplayNameEn("Live Customer Support");
                p.setDisplayNameJa("リアルタイムサポート");
                p.setDescriptionVi(
                        "Tin nhắn mới từ khách hàng hoặc phản hồi trực tiếp từ đội ngũ vận hành/quản trị.");
                p.setDescriptionEn(
                        "Incoming customer support messages and live replies from operations/admin teams.");
                p.setDescriptionJa("顧客からの新規お問い合わせと運営チームからのリアルタイム返信。");
            }
            case MAINTENANCE -> {
                p.setDisplayNameVi("Bảo trì & Sức khoẻ đội bay");
                p.setDisplayNameEn("Fleet Health & Maintenance");
                p.setDisplayNameJa("機体保守・ヘルスケア");
                p.setDescriptionVi(
                        "Lịch bảo dưỡng định kỳ đến hạn, phiếu sửa chữa kỹ thuật và cảnh báo pin/cảm biến.");
                p.setDescriptionEn(
                        "Scheduled maintenance due dates, repair work orders, and battery/sensor health alerts.");
                p.setDescriptionJa("定期点検期限、修理オーダー、バッテリー・センサー診断通知。");
            }
            case STORAGE -> {
                p.setDisplayNameVi("Kho tệp & Cụm Google Drive Pool");
                p.setDisplayNameEn("Storage & Google Drive Pool");
                p.setDisplayNameJa("ストレージ・Google Driveプール");
                p.setDescriptionVi(
                        "Cảnh báo dung lượng ổ lưu trữ, sức khoẻ kết nối OAuth/SA và tiến trình di chuyển R2.");
                p.setDescriptionEn(
                        "Drive node quota thresholds, OAuth/SA health status, and R2 migration progress.");
                p.setDescriptionJa("ドライブ容量しきい値、OAuth/SA接続状態、R2移行進捗。");
            }
            case SYSTEM -> {
                p.setDisplayNameVi("Hệ thống, Bảo mật & Đào tạo");
                p.setDisplayNameEn("System, Security & Academy");
                p.setDisplayNameJa("システム・セキュリティ・研修");
                p.setDescriptionVi(
                        "Thông báo vận hành chung, cập nhật tài khoản/quyền hạn và học liệu đào tạo mới.");
                p.setDescriptionEn(
                        "General platform announcements, account/security updates, and new academy courses.");
                p.setDescriptionJa("システム全体のお知らせ、アカウント・権限更新、新規研修コース。");
            }
        }
        return p;
    }

    public static NotificationModulePolicyResponse toPolicyResponse(NotificationModulePolicy p) {
        return new NotificationModulePolicyResponse(
                p.getId(),
                p.getModuleCode(),
                p.getDisplayNameVi(),
                p.getDisplayNameEn(),
                p.getDisplayNameJa(),
                p.getDescriptionVi(),
                p.getDescriptionEn(),
                p.getDescriptionJa(),
                p.getSeverity(),
                p.getEnabled(),
                p.getMandatory(),
                p.getInAppEnabled(),
                p.getScreenPopupEnabled(),
                p.getDesktopOsEnabled(),
                p.getMobilePushEnabled(),
                p.getEmailEnabled(),
                p.getCooldownSeconds(),
                p.getSortOrder(),
                p.getUpdatedAt());
    }

    public static UserNotificationModulePreferenceResponse toUserPrefResponse(
            NotificationModulePolicy p, UserNotificationPreference u) {
        boolean mandatory = Boolean.TRUE.equals(p.getMandatory());
        boolean muted = !mandatory && u != null && Boolean.TRUE.equals(u.getMuted());
        boolean screenPopup =
                mandatory || u == null || Boolean.TRUE.equals(u.getScreenPopupEnabled());
        boolean desktopOs = mandatory || u == null || Boolean.TRUE.equals(u.getDesktopOsEnabled());
        boolean mobilePush =
                mandatory || u == null || Boolean.TRUE.equals(u.getMobilePushEnabled());
        boolean email = mandatory || u == null || Boolean.TRUE.equals(u.getEmailEnabled());

        return new UserNotificationModulePreferenceResponse(
                p.getModuleCode(),
                p.getDisplayNameVi(),
                p.getDisplayNameEn(),
                p.getDisplayNameJa(),
                p.getDescriptionVi(),
                p.getDescriptionEn(),
                p.getDescriptionJa(),
                p.getSeverity(),
                p.getEnabled(),
                mandatory,
                muted,
                p.getScreenPopupEnabled(),
                p.getDesktopOsEnabled(),
                p.getMobilePushEnabled(),
                p.getEmailEnabled(),
                screenPopup,
                desktopOs,
                mobilePush,
                email);
    }
}
