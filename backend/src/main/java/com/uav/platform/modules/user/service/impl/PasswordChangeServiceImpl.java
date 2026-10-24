package com.uav.platform.modules.user.service.impl;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.audit.enums.AuditAction;
import com.uav.platform.modules.audit.service.AuditLogService;
import com.uav.platform.modules.auth.repository.RefreshTokenRepository;
import com.uav.platform.modules.user.dto.request.PasswordChangeRequest;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.PasswordChangeService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PasswordChangeServiceImpl implements PasswordChangeService {
    static final String WRONG_CURRENT = "Current password is incorrect";
    static final String SAME_AS_CURRENT = "New password must differ from the current password";

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final RefreshTokenRepository refreshTokens;
    private final AuditLogService audit;

    @Override
    @Transactional
    public void change(String username, PasswordChangeRequest request) {
        AppUser user = users.findByUsername(username)
                .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));
        if (!encoder.matches(request.currentPassword(), user.getPasswordHash()))
            throw SystemException.badRequest(WRONG_CURRENT);
        if (encoder.matches(request.newPassword(), user.getPasswordHash()))
            throw SystemException.badRequest(SAME_AS_CURRENT);
        user.setPasswordHash(encoder.encode(request.newPassword()));
        user.setFailedAttempts(0);
        users.save(user);
        // Every session, this one included, must sign in again with the new password.
        refreshTokens.deleteByUser(user);
        audit.record(user.getId(), username, AuditAction.UPDATE, "USER", user.getId().toString(), "PASSWORD_CHANGED");
    }
}
