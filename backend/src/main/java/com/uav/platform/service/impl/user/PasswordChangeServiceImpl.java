package com.uav.platform.service.impl.user;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.dto.request.user.PasswordChangeRequest;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.auth.RefreshTokenRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.auth.SessionTerminationService;
import com.uav.platform.service.user.PasswordChangeService;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Autowired;
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
    private SessionTerminationService sessionTermination;

    @Autowired(required = false)
    public void setSessionTermination(SessionTerminationService sessionTermination) {
        this.sessionTermination = sessionTermination;
    }

    @Override
    @Transactional
    public void change(String username, PasswordChangeRequest request) {
        AppUser user =
                users.findByUsername(username)
                        .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));
        if (request.confirmPassword() != null
                && !request.confirmPassword().equals(request.newPassword()))
            throw SystemException.badRequest("Mật khẩu xác nhận không khớp.", "PASSWORD_MISMATCH")
                    .at("confirmPassword");
        if (!encoder.matches(request.currentPassword(), user.getPasswordHash()))
            throw SystemException.badRequest(WRONG_CURRENT).at("currentPassword");
        if (encoder.matches(request.newPassword(), user.getPasswordHash()))
            throw SystemException.badRequest(SAME_AS_CURRENT).at("newPassword");
        user.setPasswordHash(encoder.encode(request.newPassword()));
        user.setFailedAttempts(0);
        users.save(user);
        // Every session, this one included, must sign in again with the new password: refresh
        // tokens are deleted and access tokens issued so far stop authenticating. The client
        // already signs out after a successful change.
        refreshTokens.deleteByUser(user);
        if (sessionTermination != null) sessionTermination.terminateAll(user, username);
        audit.record(
                user.getId(),
                username,
                AuditAction.UPDATE,
                "USER",
                user.getId().toString(),
                "PASSWORD_CHANGED");
    }
}
