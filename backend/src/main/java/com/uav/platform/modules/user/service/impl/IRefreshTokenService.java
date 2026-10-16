package com.uav.platform.modules.user.service.impl;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.entity.RefreshToken;
import com.uav.platform.modules.user.repository.RefreshTokenRepository;
import com.uav.platform.modules.user.service.RefreshTokenService;
import com.uav.platform.modules.user.service.AuthSessionLock;
import jakarta.persistence.EntityManager;
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
    private final AuthSessionLock sessionLock;
    private final EntityManager entityManager;

    public IRefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            JwtTokenProvider jwtTokenProvider,
            AuthSessionLock sessionLock,
            EntityManager entityManager
    ) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtTokenProvider = jwtTokenProvider;
        this.sessionLock = sessionLock;
        this.entityManager = entityManager;
    }

    @Override
    public RefreshToken createRefreshToken(AppUser user) {
        AppUser lockedUser = sessionLock.lock(user);
        refreshTokenRepository.deleteByUser(lockedUser);

        String token = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        Instant expiryDate = Instant.now().plusMillis(jwtTokenProvider.getRefreshExpirationMs());

        RefreshToken refreshToken = new RefreshToken(lockedUser, token, expiryDate);
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

    @Override @Transactional(readOnly = true)
    public Optional<Long> findUserIdByToken(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        return refreshTokenRepository.findUserIdByToken(token);
    }

    @Override
    public Optional<RefreshToken> findByTokenForUpdate(String token) {
        Optional<Long> owner = findUserIdByToken(token);
        if (owner.isEmpty() || sessionLock.lockById(owner.get()).isEmpty()) return Optional.empty();
        // Login/rotation may have replaced the token while we waited. Never reuse
        // the old entity snapshot or revoke the user's newer token by user ID.
        var current = refreshTokenRepository.findByTokenForUpdate(token);
        current.ifPresent(entityManager::refresh);
        return current;
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
            findByTokenForUpdate(token).ifPresent(rt -> {
                rt.revoke();
                refreshTokenRepository.save(rt);
            });
        }
    }

    @Override
    public int deleteByUser(AppUser user) {
        return refreshTokenRepository.deleteByUser(sessionLock.lock(user));
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
