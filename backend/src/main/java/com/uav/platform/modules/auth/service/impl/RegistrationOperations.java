package com.uav.platform.modules.auth.service.impl;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.util.PhoneNumbers;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.auth.dto.record.RegistrationInput;
import com.uav.platform.modules.auth.dto.request.RegisterRequest;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Sign-up rules shared by the direct and the OTP registration paths, so both reject the same input the same way.
 * Errors carry a REGISTER_* code the frontend can translate.
 */
public final class RegistrationOperations {
    static final Pattern USERNAME = Pattern.compile("^[A-Za-z0-9._-]{3,50}$");

    /** BCrypt only reads the first 72 bytes; longer passwords are rejected rather than silently truncated. */
    static final int PASSWORD_MAX_BYTES = 72;

    static final int EMAIL_MAX_LENGTH = 255;

    /** Names that would read as the platform itself or as staff. */
    static final Set<String> RESERVED =
            Set.of(
                    "admin",
                    "administrator",
                    "root",
                    "system",
                    "support",
                    "operator",
                    "operations",
                    "superadmin",
                    "uavpas",
                    "uav-pas",
                    "uav_pas",
                    "vju",
                    "security",
                    "null",
                    "undefined");

    private RegistrationOperations() {}

    public static final String TAKEN_EMAIL = "Email này đã được đăng ký.";
    public static final String TAKEN_USERNAME = "Tên đăng nhập đã có người dùng.";
    public static final String TAKEN_PHONE = "Số điện thoại đã được đăng ký.";
    public static final String PENDING_APPROVAL =
            "Tài khoản Nhân sự vận hành đang chờ quản trị viên duyệt. Bạn sẽ đăng nhập được sau khi được kích hoạt.";

    public static RegistrationInput normalize(RegisterRequest request) {
        if (request == null)
            throw SystemException.badRequest(CoreConstants.REGISTRATION_DATA_REQUIRED);

        String username = request.username() == null ? "" : request.username().trim();
        if (!USERNAME.matcher(username).matches())
            throw SystemException.badRequest(
                            "Tên đăng nhập gồm 3–50 ký tự: chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.",
                            "REGISTER_USERNAME_INVALID")
                    .at("username");
        if (RESERVED.contains(username.toLowerCase(Locale.ROOT)))
            throw SystemException.badRequest(
                            "Tên đăng nhập này đã được hệ thống giữ lại, hãy chọn tên khác.",
                            "REGISTER_USERNAME_RESERVED")
                    .at("username");

        String email =
                request.email() == null ? "" : request.email().trim().toLowerCase(Locale.ROOT);
        if (email.isEmpty() || email.length() > EMAIL_MAX_LENGTH)
            throw SystemException.badRequest(
                            "Địa chỉ email không hợp lệ.", "REGISTER_EMAIL_INVALID")
                    .at("email");

        String phone = normalizePhone(request.phoneNumber());
        if (phone == null)
            throw SystemException.badRequest(
                            "Số điện thoại Việt Nam gồm 10–11 chữ số, bắt đầu bằng 0 hoặc +84.",
                            "REGISTER_PHONE_INVALID")
                    .at("phoneNumber");

        checkPassword(request.password(), request.confirmPassword(), "password", "confirmPassword");

        UserRole role = role(request.role());
        return new RegistrationInput(username, email, phone, role, UserStatus.ACTIVE);
    }

    /**
     * Password rules for sign-up and reset: at least 8 characters after trimming, at most 72 bytes (what BCrypt
     * reads), and equal to the confirmation when one is sent. Errors point at the given field names.
     */
    public static void checkPassword(
            String password, String confirm, String field, String confirmField) {
        String value = password == null ? "" : password;
        if (value.isBlank() || value.strip().length() < 8)
            throw SystemException.badRequest(
                            "Mật khẩu phải có ít nhất 8 ký tự.", "REGISTER_PASSWORD_TOO_SHORT")
                    .at(field);
        if (value.getBytes(StandardCharsets.UTF_8).length > PASSWORD_MAX_BYTES)
            throw SystemException.badRequest(
                            "Mật khẩu tối đa 72 byte (khoảng 72 ký tự không dấu).",
                            "REGISTER_PASSWORD_TOO_LONG")
                    .at(field);
        if (confirm != null && !confirm.equals(value))
            throw SystemException.badRequest(
                            "Mật khẩu xác nhận không khớp.", "REGISTER_PASSWORD_MISMATCH")
                    .at(confirmField);
    }

    static String normalizePhone(String raw) {
        return PhoneNumbers.normalizeVietnam(raw);
    }

    /**
     * Self sign-up only opens customer accounts. Operations and admin accounts are created by an
     * administrator after the person gets in touch, so asking for them here is refused.
     */
    static UserRole role(String raw) {
        if (raw == null || raw.isBlank()) return UserRole.ROLE_PILOT;
        return switch (raw.trim().toUpperCase(Locale.ROOT)) {
            case "ROLE_PILOT", "PILOT", "CUSTOMER" -> UserRole.ROLE_PILOT;
            case "ROLE_OPERATOR", "OPERATOR" ->
                    throw SystemException.badRequest(
                                    "Tài khoản vận hành do quản trị viên cấp. Vui lòng liên hệ để được mở tài khoản.",
                                    "REGISTER_ROLE_STAFF_BY_INVITATION")
                            .at("role");
            default ->
                    throw SystemException.badRequest(
                                    "Loại tài khoản không hợp lệ.", "REGISTER_ROLE_INVALID")
                            .at("role");
        };
    }

    /** A self-registered operations account that an administrator has not activated yet. */
    public static boolean awaitsApproval(AppUser user) {
        return user.getRole() == UserRole.ROLE_OPERATOR && user.getStatus() == UserStatus.INACTIVE;
    }
}
