package com.uav.platform.modules.user.service.impl;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.entity.RefreshToken;
import com.uav.platform.modules.user.repository.RefreshTokenRepository;
import com.uav.platform.modules.user.service.RefreshTokenService;
import com.uav.platform.error.SystemException;
import com.uav.platform.security.jwt.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class IRefreshTokenService implements RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(IRefreshTokenService.class);

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;

    public IRefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public RefreshToken createRefreshToken(AppUser user) {
        refreshTokenRepository.deleteByUser(user);

        String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        Instant expiryDate = Instant.now().plusMillis(jwtTokenProvider.getRefreshExpirationMs());

        RefreshToken refreshToken = new RefreshToken(user, token, expiryDate);
        return refreshTokenRepository.save(refreshToken);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RefreshToken> findByToken(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        return refreshTokenRepository.findByToken(token);
    }

    @Override
    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token == null) {
            throw SystemException.unauthorized("Refresh token does not exist");
        }
        if (!token.isValid()) {
            refreshTokenRepository.delete(token);
            throw SystemException.unauthorized("Refresh token is expired or revoked. Please log in again.");
        }
        return token;
    }

    @Override
    public void revokeToken(String token) {
        if (token != null && !token.isBlank()) {
            refreshTokenRepository.findByToken(token).ifPresent(rt -> {
                rt.revoke();
                refreshTokenRepository.save(rt);
            });
        }
    }

    @Override
    public int deleteByUser(AppUser user) {
        return refreshTokenRepository.deleteByUser(user);
    }

    @Override
    @Scheduled(cron = "0 30 * * * *") // Runs every hour at :30
    public void purgeExpiredTokens() {
        int deleted = refreshTokenRepository.deleteExpiredTokens(Instant.now());
        if (deleted > 0) {
            log.info("Purged {} expired refresh tokens", deleted);
        }
    }
}
