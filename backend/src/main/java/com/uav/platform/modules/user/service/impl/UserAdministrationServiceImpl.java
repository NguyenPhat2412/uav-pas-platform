package com.uav.platform.modules.user.service.impl;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.util.PhoneNumbers;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.auth.repository.RefreshTokenRepository;
import com.uav.platform.modules.user.dto.request.AdminCreateUserRequest;
import com.uav.platform.modules.user.dto.request.BulkLockRequest;
import com.uav.platform.modules.user.dto.request.PasswordResetRequest;
import com.uav.platform.modules.user.dto.response.BulkActionResponse;
import com.uav.platform.modules.user.dto.response.UserResponse;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.mapper.UserMapper;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.UserAdministrationService;
import com.uav.platform.modules.user.service.UserService;
import com.uav.platform.modules.user.specification.UserSpecifications;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserAdministrationServiceImpl implements UserAdministrationService {
    private static final DateTimeFormatter CSV_DATE =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final int EXPORT_LIMIT = 5000;

    private final UserRepository userRepository;
    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final RefreshTokenRepository refreshTokens;
    private final UserMapper userMapper;

    @Override
    @Transactional
    public UserResponse create(AdminCreateUserRequest request, String actor) {
        String username = request.username().trim();
        String email = request.email().trim();
        // Same phone rule and stored form as self sign-up.
        String phone = PhoneNumbers.normalizeVietnam(request.phoneNumber());
        if (phone == null)
            throw SystemException.badRequest(
                            "Số điện thoại Việt Nam gồm 10–11 chữ số, bắt đầu bằng 0 hoặc +84.",
                            "USER_PHONE_INVALID")
                    .at("phoneNumber");
        if (request.confirmPassword() != null
                && !request.confirmPassword().equals(request.password()))
            throw SystemException.badRequest("Mật khẩu xác nhận không khớp.", "PASSWORD_MISMATCH")
                    .at("confirmPassword");
        if (userRepository.existsByUsername(username))
            throw SystemException.conflict(CoreConstants.USERNAME_ALREADY_EXISTS).at("username");
        if (userRepository.existsByEmail(email))
            throw SystemException.conflict(CoreConstants.EMAIL_ALREADY_EXISTS).at("email");
        if (userRepository.existsByPhoneNumber(phone))
            throw SystemException.conflict(CoreConstants.PHONE_ALREADY_EXISTS).at("phoneNumber");
        String fullName =
                request.fullName() == null || request.fullName().isBlank()
                        ? null
                        : request.fullName().trim();
        AppUser user =
                UserAccountServiceImpl.createUser(
                        username,
                        email,
                        passwordEncoder.encode(request.password()),
                        phone,
                        null,
                        fullName,
                        null,
                        request.role(),
                        UserStatus.ACTIVE);
        AppUser saved = userRepository.save(user);
        auditLogService.record(
                null,
                actor,
                AuditAction.CREATE,
                "USER",
                saved.getId().toString(),
                "role=" + request.role());
        return userMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void resetPassword(Long id, PasswordResetRequest request, String actor) {
        AppUser user =
                userRepository
                        .findById(id)
                        .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setFailedAttempts(0);
        userRepository.save(user);
        // Existing sessions must not outlive a credential reset.
        refreshTokens.deleteByUser(user);
        auditLogService.record(
                null, actor, AuditAction.UPDATE, "USER", id.toString(), "PASSWORD_RESET");
    }

    @Override
    public BulkActionResponse bulkLock(BulkLockRequest request, String actor) {
        List<Long> processed = new ArrayList<>();
        List<BulkActionResponse.Skipped> skipped = new ArrayList<>();
        for (Long id : new LinkedHashSet<>(request.ids())) {
            AppUser user = userRepository.findById(id).orElse(null);
            if (user == null) {
                skipped.add(new BulkActionResponse.Skipped(id, "NOT_FOUND"));
            } else if (request.locked() && user.getUsername().equals(actor)) {
                skipped.add(new BulkActionResponse.Skipped(id, "SELF"));
            } else {
                if (request.locked()) userService.lockUser(id, actor);
                else userService.unlockUser(id, actor);
                processed.add(id);
            }
        }
        return new BulkActionResponse(processed, skipped);
    }

    @Override
    @Transactional(readOnly = true)
    public String exportCsv(String keyword, UserRole role, UserStatus status) {
        Specification<AppUser> spec =
                Specification.where(UserSpecifications.hasKeyword(keyword))
                        .and(UserSpecifications.hasRole(role))
                        .and(UserSpecifications.hasStatus(status));
        StringBuilder csv =
                new StringBuilder(
                        "﻿id,username,full_name,email,phone,role,status,locked,created_at\n");
        userRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .limit(EXPORT_LIMIT)
                .forEach(
                        u ->
                                csv.append(u.getId())
                                        .append(',')
                                        .append(cell(u.getUsername()))
                                        .append(',')
                                        .append(cell(u.getFullName()))
                                        .append(',')
                                        .append(cell(u.getEmail()))
                                        .append(',')
                                        .append(cell(u.getPhoneNumber()))
                                        .append(',')
                                        .append(u.getRole())
                                        .append(',')
                                        .append(u.getStatus())
                                        .append(',')
                                        .append(u.isManualLocked())
                                        .append(',')
                                        .append(
                                                u.getCreatedAt() == null
                                                        ? ""
                                                        : CSV_DATE.format(u.getCreatedAt()))
                                        .append('\n'));
        return csv.toString();
    }

    /** Quotes a CSV cell and neutralises spreadsheet formula prefixes. */
    static String cell(String value) {
        if (value == null) return "";
        String safe = value.matches("^[=+\\-@\\t\\r].*") ? "'" + value : value;
        return '"' + safe.replace("\"", "\"\"") + '"';
    }
}
