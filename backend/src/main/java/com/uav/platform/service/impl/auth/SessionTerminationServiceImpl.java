package com.uav.platform.service.impl.auth;

import com.uav.platform.entity.auth.AuthOtpToken;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.repository.auth.AuthOtpTokenRepository;
import com.uav.platform.repository.auth.RefreshTokenRepository;
import com.uav.platform.service.auth.SessionTerminationService;
import com.uav.platform.service.security.SessionRevocationService;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class SessionTerminationServiceImpl implements SessionTerminationService {

    private final RefreshTokenRepository refreshTokens;
    private final AuthOtpTokenRepository otpTokens;
    private final ObjectProvider<SessionRevocationService> revocations;

    public SessionTerminationServiceImpl(
            RefreshTokenRepository refreshTokens,
            AuthOtpTokenRepository otpTokens,
            ObjectProvider<SessionRevocationService> revocations) {
        this.refreshTokens = refreshTokens;
        this.otpTokens = otpTokens;
        this.revocations = revocations;
    }

    @Override
    public int terminateAll(AppUser user, String actor) {
        if (user == null || user.getId() == null) return 0;
        // The bulk update flushes pending account changes first; a refresh rotating concurrently
        // holds the account row lock, so its new token is committed before this update reads.
        int revoked = refreshTokens.revokeByUserId(user.getId());
        SessionRevocationService service = revocations.getIfAvailable();
        if (service != null) service.revokeAccessTokens(List.of(user.getId()), actor);
        if (user.getEmail() != null) {
            List<AuthOtpToken> pending =
                    otpTokens.findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(
                            user.getEmail(), AuthOtpServiceImpl.PURPOSE_LOGIN_2FA);
            if (!pending.isEmpty()) {
                LocalDateTime now = LocalDateTime.now();
                pending.forEach(t -> t.setConsumedAt(now));
                otpTokens.saveAll(pending);
            }
        }
        return revoked;
    }
}
