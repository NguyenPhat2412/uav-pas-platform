package com.uav.platform.service.impl.user;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.util.PhoneNumbers;
import com.uav.platform.dto.record.user.UserProfileUpdateCommand;
import com.uav.platform.dto.request.user.UserProfilePatchRequest;
import com.uav.platform.dto.response.user.UserProfileResponse;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.user.UserStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.auth.AuthSessionLock;
import com.uav.platform.service.user.UserProfileService;

import lombok.RequiredArgsConstructor;

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
    private final UserRepository users;
    private final AuthSessionLock lock;
    private final AuditLogService audit;

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
