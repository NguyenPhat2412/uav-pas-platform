package com.uav.platform.modules.user.service;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.auth.service.AuthSessionLock;
import com.uav.platform.modules.user.dto.request.UserProfileUpdateRequest;
import com.uav.platform.modules.user.dto.response.UserProfileResponse;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class UserProfileService {
    private final UserRepository users;
    private final AuthSessionLock lock;
    private final AuditLogService audit;

    public UserProfileService(UserRepository users, AuthSessionLock lock, AuditLogService audit) {
        this.users = users;
        this.lock = lock;
        this.audit = audit;
    }

    public UserProfileResponse get(String username) {
        var user = resolve(username);
        requireAvailable(user);
        return response(user);
    }

    @Transactional
    public UserProfileResponse update(String username, UserProfileUpdateRequest request) {
        String name = request.fullName() == null ? null : request.fullName().trim();
        if (name != null && name.isEmpty()) name = null;
        String phone = request.phoneNumber() == null ? "" : request.phoneNumber().trim();
        if (name != null && name.length() > 100)
            throw SystemException.badRequest("Họ tên không được vượt quá 100 ký tự.");
        if (phone.isEmpty() || phone.length() > 20)
            throw SystemException.badRequest(
                    "Số điện thoại bắt buộc và không được vượt quá 20 ký tự.");
        if (request.expectedRevision() == null
                || !request.expectedRevision().matches("[a-f0-9]{64}")) {
            throw SystemException.badRequest(
                    "Thiếu phiên bản hồ sơ hợp lệ. Vui lòng tải lại hồ sơ.");
        }
        var user = lock.lock(resolve(username));
        requireAvailable(user);
        if (!response(user).revision().equals(request.expectedRevision())) {
            throw new SystemException(
                    "Hồ sơ đã thay đổi. Vui lòng tải bản mới nhất trước khi lưu.",
                    HttpStatus.CONFLICT,
                    "PROFILE_REVISION_CONFLICT");
        }
        var changed = new ArrayList<String>();
        if (!Objects.equals(name, user.getFullName())) changed.add("fullName");
        if (!Objects.equals(phone, user.getPhoneNumber())) changed.add("phoneNumber");
        if (changed.isEmpty()) return response(user);
        if (users.existsByPhoneNumberAndIdNot(phone, user.getId()))
            throw SystemException.conflict(CoreConstants.PHONE_ALREADY_EXISTS);
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
                                                .plusMinutes(AppUser.LOCK_TIME_DURATION_MINUTES))) {
            throw new SystemException(
                    "Tài khoản hiện không thể cập nhật hồ sơ.",
                    HttpStatus.FORBIDDEN,
                    "PROFILE_ACCOUNT_UNAVAILABLE");
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
