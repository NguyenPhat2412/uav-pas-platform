package com.uav.platform.service.impl.user;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.util.PhoneNumbers;
import com.uav.platform.dto.record.user.UserProfileUpdateCommand;
import com.uav.platform.dto.request.user.AccountDeletionRequest;
import com.uav.platform.dto.request.user.UserProfilePatchRequest;
import com.uav.platform.dto.response.user.AccountDeletionPolicyResponse;
import com.uav.platform.dto.response.user.UserProfileResponse;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.billing.InvoiceStatus;
import com.uav.platform.enums.mission.MissionStatus;
import com.uav.platform.enums.user.UserRole;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.billing.InvoiceRepository;
import com.uav.platform.repository.billing.UserQuotaRepository;
import com.uav.platform.repository.mission.MissionRepository;
import com.uav.platform.repository.notification.PushDeviceTokenRepository;
import com.uav.platform.repository.permission.UserPermissionRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.auth.AuthSessionLock;
import com.uav.platform.service.auth.RefreshTokenService;
import com.uav.platform.service.auth.SessionTerminationService;
import com.uav.platform.service.security.SessionRevocationService;
import com.uav.platform.service.settings.SystemConfigService;
import com.uav.platform.service.user.UserProfileService;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {
    public static final String KEY_DELETION_ENABLED = "account.deletion.enabled";
    public static final String KEY_DELETION_ALLOW_STAFF = "account.deletion.allow_staff_roles";
    public static final String KEY_DELETION_BLOCK_MISSIONS =
            "account.deletion.block_active_missions";
    public static final String KEY_DELETION_BLOCK_INVOICES =
            "account.deletion.block_unpaid_invoices";
    public static final String KEY_DELETION_REQUIRE_PASSWORD = "account.deletion.require_password";
    public static final String KEY_DELETION_REQUIRE_REASON = "account.deletion.require_reason";
    public static final String KEY_DELETION_CONFIRMATION_PHRASE =
            "account.deletion.confirmation_phrase";
    public static final String KEY_DELETION_MODE = "account.deletion.mode";
    public static final String KEY_DELETION_NOTICE_MESSAGE = "account.deletion.notice_message";

    public static final String DEFAULT_CONFIRMATION_PHRASE = "XOA TAI KHOAN";
    public static final String DEFAULT_DELETION_MODE = "ANONYMIZE";
    public static final String HARD_DELETE_MODE = "HARD_DELETE";
    public static final String DEFAULT_NOTICE_MESSAGE =
            "Sau khi xác nhận xoá, toàn bộ phiên đăng nhập và thiết bị nhận thông báo sẽ bị thu hồi ngay lập tức; dữ liệu định danh cá nhân được xử lý theo chính sách bảo mật của hệ thống.";

    private static final Set<MissionStatus> TERMINAL_MISSION_STATUSES =
            EnumSet.of(
                    MissionStatus.COMPLETED,
                    MissionStatus.CANCELLED,
                    MissionStatus.FAILED,
                    MissionStatus.REJECTED);

    private final UserRepository users;
    private final AuthSessionLock lock;
    private final AuditLogService audit;

    private SystemConfigService systemConfigService;
    private MissionRepository missionRepository;
    private InvoiceRepository invoiceRepository;
    private PasswordEncoder passwordEncoder;
    private SessionRevocationService sessionRevocationService;
    private SessionTerminationService sessionTerminationService;
    private RefreshTokenService refreshTokenService;
    private PushDeviceTokenRepository pushDeviceTokenRepository;
    private UserPermissionRepository userPermissionRepository;
    private UserQuotaRepository userQuotaRepository;

    @Autowired(required = false)
    public void setSystemConfigService(SystemConfigService systemConfigService) {
        this.systemConfigService = systemConfigService;
    }

    @Autowired(required = false)
    public void setMissionRepository(MissionRepository missionRepository) {
        this.missionRepository = missionRepository;
    }

    @Autowired(required = false)
    public void setInvoiceRepository(InvoiceRepository invoiceRepository) {
        this.invoiceRepository = invoiceRepository;
    }

    @Autowired(required = false)
    public void setPasswordEncoder(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @Autowired(required = false)
    public void setSessionRevocationService(SessionRevocationService sessionRevocationService) {
        this.sessionRevocationService = sessionRevocationService;
    }

    @Autowired(required = false)
    public void setSessionTerminationService(SessionTerminationService sessionTerminationService) {
        this.sessionTerminationService = sessionTerminationService;
    }

    @Autowired(required = false)
    public void setRefreshTokenService(RefreshTokenService refreshTokenService) {
        this.refreshTokenService = refreshTokenService;
    }

    @Autowired(required = false)
    public void setPushDeviceTokenRepository(PushDeviceTokenRepository pushDeviceTokenRepository) {
        this.pushDeviceTokenRepository = pushDeviceTokenRepository;
    }

    @Autowired(required = false)
    public void setUserPermissionRepository(UserPermissionRepository userPermissionRepository) {
        this.userPermissionRepository = userPermissionRepository;
    }

    @Autowired(required = false)
    public void setUserQuotaRepository(UserQuotaRepository userQuotaRepository) {
        this.userQuotaRepository = userQuotaRepository;
    }

    @Override
    public UserProfileResponse get(String username) {
        var user = resolve(username);
        requireAvailable(user);
        return response(user);
    }

    @Override
    @Transactional
    public UserProfileResponse updatePayload(String username, UserProfilePatchRequest request) {
        return update(username, toUpdateCommand(request.fields()));
    }

    private UserProfileUpdateCommand toUpdateCommand(Map<String, Object> body) {
        if (!body.keySet().equals(Set.of("fullName", "phoneNumber", "expectedRevision"))) {
            throw SystemException.badRequest(
                    "Chỉ được cập nhật họ tên và số điện thoại kèm phiên bản hồ sơ.");
        }
        if (body.get("fullName") != null && !(body.get("fullName") instanceof String)
                || !(body.get("phoneNumber") instanceof String)
                || !(body.get("expectedRevision") instanceof String)) {
            throw SystemException.badRequest("Thông tin hồ sơ không đúng định dạng.");
        }
        return new UserProfileUpdateCommand(
                (String) body.get("fullName"),
                (String) body.get("phoneNumber"),
                (String) body.get("expectedRevision"));
    }

    @Override
    @Transactional
    public UserProfileResponse update(String username, UserProfileUpdateCommand request) {
        String name = request.fullName() == null ? null : request.fullName().trim();
        if (name != null && name.isEmpty()) name = null;
        String rawPhone = request.phoneNumber() == null ? "" : request.phoneNumber().trim();
        if (name != null && name.length() > 100)
            throw SystemException.badRequest(
                            "Họ tên không được vượt quá 100 ký tự.", "PROFILE_NAME_TOO_LONG")
                    .at("fullName");
        if (rawPhone.isEmpty())
            throw SystemException.badRequest(
                            "Vui lòng nhập số điện thoại.", "PROFILE_PHONE_REQUIRED")
                    .at("phoneNumber");
        // Same rule and stored form as sign-up, so a number cannot be registered twice in different
        // spellings.
        String phone = PhoneNumbers.normalizeVietnam(rawPhone);
        if (phone == null)
            throw SystemException.badRequest(
                            "Số điện thoại Việt Nam gồm 10–11 chữ số, bắt đầu bằng 0 hoặc +84.",
                            "PROFILE_PHONE_INVALID")
                    .at("phoneNumber");
        if (request.expectedRevision() == null
                || !request.expectedRevision().matches("[a-f0-9]{64}")) {
            throw SystemException.badRequest(
                    "Thiếu phiên bản hồ sơ hợp lệ. Vui lòng tải lại hồ sơ.");
        }
        var user = lock.lock(resolve(username));
        requireAvailable(user);
        if (!response(user).revision().equals(request.expectedRevision())) {
            throw SystemException.conflict(
                    "Hồ sơ đã thay đổi. Vui lòng tải bản mới nhất trước khi lưu.",
                    "PROFILE_REVISION_CONFLICT");
        }
        var changed = new ArrayList<String>();
        if (!Objects.equals(name, user.getFullName())) changed.add("fullName");
        if (!Objects.equals(phone, user.getPhoneNumber())) changed.add("phoneNumber");
        if (changed.isEmpty()) return response(user);
        if (users.existsByPhoneNumberAndIdNot(phone, user.getId()))
            throw SystemException.conflict(CoreConstants.PHONE_ALREADY_EXISTS).at("phoneNumber");
        user.setFullName(name);
        user.setPhoneNumber(phone);
        users.saveAndFlush(user);
        audit.record(
                user.getId(),
                user.getUsername(),
                AuditAction.UPDATE,
                "USER_PROFILE",
                user.getId().toString(),
                "Updated fields: " + String.join(", ", changed));
        return response(user);
    }

    @Override
    public AccountDeletionPolicyResponse getDeletionPolicy(String username) {
        var user = resolve(username);
        requireAvailable(user);
        return evaluateDeletionPolicy(user);
    }

    @Override
    @Transactional
    public void deleteOwnAccount(String username, AccountDeletionRequest request) {
        var resolved = resolve(username);
        var user = lock != null ? lock.lock(resolved) : resolved;
        requireAvailable(user);

        AccountDeletionPolicyResponse policy = evaluateDeletionPolicy(user);
        if (!policy.enabled() || !policy.eligible()) {
            if ("ACTIVE_MISSIONS_BLOCKING".equals(policy.ineligibleReasonCode())
                    || "UNPAID_INVOICES_BLOCKING".equals(policy.ineligibleReasonCode())) {
                throw SystemException.conflict(
                        policy.ineligibleReason(), policy.ineligibleReasonCode());
            }
            throw SystemException.forbidden(
                    policy.ineligibleReason(), policy.ineligibleReasonCode());
        }

        String phrase =
                request != null && request.confirmationPhrase() != null
                        ? request.confirmationPhrase().trim()
                        : "";
        if (!phrase.equalsIgnoreCase(policy.confirmationPhrase().trim())) {
            throw SystemException.badRequest(
                            "Vui lòng nhập chính xác cụm từ xác nhận: "
                                    + policy.confirmationPhrase(),
                            "INVALID_CONFIRMATION_PHRASE")
                    .at("confirmationPhrase");
        }

        if (policy.requirePassword() && policy.hasPassword()) {
            String currentPassword = request != null ? request.currentPassword() : null;
            if (currentPassword == null
                    || currentPassword.isEmpty()
                    || passwordEncoder == null
                    || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
                throw SystemException.badRequest(
                                "Mật khẩu hiện tại không chính xác.", "INVALID_CURRENT_PASSWORD")
                        .at("currentPassword");
            }
        }

        String trimmedReason =
                request != null && request.reason() != null ? request.reason().trim() : "";
        if (trimmedReason.length() > 500) {
            throw SystemException.badRequest(
                            "Lý do xoá tài khoản không được vượt quá 500 ký tự.", "REASON_TOO_LONG")
                    .at("reason");
        }
        if (policy.requireReason() && trimmedReason.isEmpty()) {
            throw SystemException.badRequest(
                            "Vui lòng nhập lý do xoá tài khoản.", "REASON_REQUIRED")
                    .at("reason");
        }
        String storedReason = trimmedReason.isEmpty() ? null : trimmedReason;

        Long userId = user.getId();
        String originalUsername = user.getUsername();

        if (sessionTerminationService != null) {
            sessionTerminationService.terminateAll(user, originalUsername);
        }
        if (sessionRevocationService != null && userId != null) {
            sessionRevocationService.revokeAccessTokens(List.of(userId), originalUsername);
        }
        if (refreshTokenService != null) {
            refreshTokenService.deleteByUser(user);
        }
        if (pushDeviceTokenRepository != null && userId != null) {
            pushDeviceTokenRepository.deleteByUserId(userId);
        }

        long totalMissions =
                missionRepository != null && userId != null
                        ? missionRepository.countAnyByUserId(userId)
                        : 0L;
        long totalInvoices =
                invoiceRepository != null && userId != null
                        ? invoiceRepository.countByUserId(userId)
                        : 0L;
        boolean executeHardDelete =
                HARD_DELETE_MODE.equals(policy.mode()) && totalMissions == 0 && totalInvoices == 0;

        String effectiveMode;
        if (executeHardDelete) {
            if (userPermissionRepository != null && userId != null) {
                userPermissionRepository.deleteByUserId(userId);
            }
            if (userQuotaRepository != null && userId != null) {
                userQuotaRepository.deleteByUserId(userId);
            }
            users.delete(user);
            effectiveMode = HARD_DELETE_MODE;
        } else {
            String shortHex = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            user.setStatus(UserStatus.INACTIVE);
            user.setManualLocked(true);
            user.setPasswordHash(null);
            user.setAppleSub(null);
            user.setPhoneNumber(null);
            user.setFullName("Tài khoản đã xoá");
            user.setAvatarUrl(null);
            user.setTotpSecret(null);
            user.setPendingTotpSecret(null);
            user.setTwoFactorEnabled(false);
            user.setEmailVerified(false);
            user.setDeletedAt(LocalDateTime.now());
            user.setDeletionReason(storedReason);
            user.setUsername("deleted_" + userId + "_" + shortHex);
            user.setEmail("deleted+" + userId + "." + shortHex + "@deleted.invalid");
            users.save(user);
            effectiveMode = DEFAULT_DELETION_MODE;
        }

        if (audit != null) {
            audit.record(
                    userId,
                    originalUsername,
                    AuditAction.DELETE,
                    "USER_ACCOUNT",
                    String.valueOf(userId),
                    "SELF_ACCOUNT_DELETED:" + effectiveMode);
        }
    }

    private AccountDeletionPolicyResponse evaluateDeletionPolicy(AppUser user) {
        boolean enabled = configBoolean(KEY_DELETION_ENABLED, true);
        boolean allowStaffRoles = configBoolean(KEY_DELETION_ALLOW_STAFF, false);
        boolean blockActiveMissions = configBoolean(KEY_DELETION_BLOCK_MISSIONS, true);
        boolean blockUnpaidInvoices = configBoolean(KEY_DELETION_BLOCK_INVOICES, true);
        boolean requirePasswordSetting = configBoolean(KEY_DELETION_REQUIRE_PASSWORD, true);
        boolean requireReason = configBoolean(KEY_DELETION_REQUIRE_REASON, false);

        String rawPhrase =
                configString(KEY_DELETION_CONFIRMATION_PHRASE, DEFAULT_CONFIRMATION_PHRASE);
        String confirmationPhrase = rawPhrase.isEmpty() ? DEFAULT_CONFIRMATION_PHRASE : rawPhrase;

        String rawMode = configString(KEY_DELETION_MODE, DEFAULT_DELETION_MODE);
        String mode =
                HARD_DELETE_MODE.equalsIgnoreCase(rawMode)
                        ? HARD_DELETE_MODE
                        : DEFAULT_DELETION_MODE;

        String rawNotice = configString(KEY_DELETION_NOTICE_MESSAGE, DEFAULT_NOTICE_MESSAGE);
        String noticeMessage = rawNotice.isEmpty() ? DEFAULT_NOTICE_MESSAGE : rawNotice;

        long activeMissionCount =
                missionRepository != null && user.getId() != null
                        ? missionRepository.countActiveByUserId(
                                user.getId(), TERMINAL_MISSION_STATUSES)
                        : 0L;
        long unpaidInvoiceCount =
                invoiceRepository != null && user.getId() != null
                        ? invoiceRepository.countByUserIdAndStatus(
                                user.getId(), InvoiceStatus.PENDING)
                        : 0L;

        boolean hasPassword = user.getPasswordHash() != null && !user.getPasswordHash().isBlank();
        boolean requirePassword = requirePasswordSetting && hasPassword;

        boolean eligible = true;
        String ineligibleReasonCode = null;
        String ineligibleReason = null;

        if (!enabled) {
            eligible = false;
            ineligibleReasonCode = "ACCOUNT_DELETION_DISABLED";
            ineligibleReason = "Chức năng tự xoá tài khoản hiện đang tạm tắt bởi Quản trị viên.";
        } else if (user.getRole() == UserRole.ROLE_ADMIN) {
            eligible = false;
            ineligibleReasonCode = "ADMIN_PROTECTED";
            ineligibleReason = "Tài khoản Quản trị viên hệ thống không thể tự xoá.";
        } else if (user.getRole() != UserRole.ROLE_PILOT && !allowStaffRoles) {
            eligible = false;
            ineligibleReasonCode = "STAFF_ROLE_RESTRICTED";
            ineligibleReason =
                    "Tài khoản nhân sự nội bộ cần liên hệ Quản trị viên để thu hồi theo quy trình.";
        } else if (blockActiveMissions && activeMissionCount > 0) {
            eligible = false;
            ineligibleReasonCode = "ACTIVE_MISSIONS_BLOCKING";
            ineligibleReason =
                    "Bạn đang có "
                            + activeMissionCount
                            + " nhiệm vụ bay chưa hoàn tất. Vui lòng hoàn tất hoặc hủy nhiệm vụ trước khi xoá tài khoản.";
        } else if (blockUnpaidInvoices && unpaidInvoiceCount > 0) {
            eligible = false;
            ineligibleReasonCode = "UNPAID_INVOICES_BLOCKING";
            ineligibleReason =
                    "Bạn đang có "
                            + unpaidInvoiceCount
                            + " hóa đơn chờ thanh toán. Vui lòng hoàn tất thanh toán trước khi xoá tài khoản.";
        }

        return new AccountDeletionPolicyResponse(
                enabled,
                eligible,
                ineligibleReasonCode,
                ineligibleReason,
                hasPassword,
                requirePassword,
                requireReason,
                confirmationPhrase,
                mode,
                blockActiveMissions,
                blockUnpaidInvoices,
                activeMissionCount,
                unpaidInvoiceCount,
                noticeMessage);
    }

    private boolean configBoolean(String key, boolean fallback) {
        String raw = configString(key, Boolean.toString(fallback));
        if ("true".equalsIgnoreCase(raw)) return true;
        if ("false".equalsIgnoreCase(raw)) return false;
        return fallback;
    }

    private String configString(String key, String fallback) {
        if (systemConfigService == null) return fallback;
        String val = systemConfigService.valueOrDefault(key, fallback);
        return val == null ? fallback : val.trim();
    }

    private AppUser resolve(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> SystemException.unauthorized("Tài khoản không còn tồn tại."));
    }

    private void requireAvailable(AppUser user) {
        if (user.getStatus() != UserStatus.ACTIVE
                || user.isManualLocked()
                || user.getLockTime() != null
                        && LocalDateTime.now()
                                .isBefore(
                                        user.getLockTime()
                                                .plusMinutes(
                                                        UserAccountServiceImpl
                                                                .LOCK_TIME_DURATION_MINUTES))) {
            throw SystemException.forbidden(
                    "Tài khoản hiện không thể cập nhật hồ sơ.", "PROFILE_ACCOUNT_UNAVAILABLE");
        }
    }

    private UserProfileResponse response(AppUser user) {
        String content =
                user.getId() + ":" + part(user.getFullName()) + part(user.getPhoneNumber());
        try {
            String revision =
                    HexFormat.of()
                            .formatHex(
                                    MessageDigest.getInstance("SHA-256")
                                            .digest(content.getBytes(StandardCharsets.UTF_8)));
            return new UserProfileResponse(
                    user.getId(), user.getFullName(), user.getPhoneNumber(), revision);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    private String part(String value) {
        return value == null ? "-:" : value.length() + ":" + value;
    }
}
