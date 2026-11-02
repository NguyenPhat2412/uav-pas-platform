package com.uav.platform.service.impl.auth;

import com.uav.platform.entity.auth.RefreshToken;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.auth.ClientKind;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.auth.RefreshTokenRepository;
import com.uav.platform.security.jwt.JwtTokenProvider;
import com.uav.platform.service.auth.AuthSessionLock;
import com.uav.platform.service.auth.RefreshTokenService;

import jakarta.persistence.EntityManager;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthSessionLock sessionLock;
    private final EntityManager entityManager;

    @Override
    public RefreshToken createRefreshToken(AppUser user) {
        return createRefreshToken(user, currentClient());
    }

    @Override
    public RefreshToken createRefreshToken(AppUser user, ClientKind client) {
        ClientKind kind = client != null ? client : ClientKind.WEB;
        AppUser lockedUser = sessionLock.lock(user);
        // Replace only this client's session: signing in on the phone must not sign the browser
        // out.
        refreshTokenRepository.deleteByUserAndClient(lockedUser, kind);

        String token =
                UUID.randomUUID().toString().replace("-", "")
                        + UUID.randomUUID().toString().replace("-", "");
        Instant expiryDate = Instant.now().plusMillis(jwtTokenProvider.getRefreshExpirationMs());

        RefreshToken refreshToken = new RefreshToken(lockedUser, token, expiryDate, kind);
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
    @Transactional(readOnly = true)
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

    /** The client kind the current request announced (X-Client); WEB outside a request or without the header. */
    public static ClientKind currentClient() {
        if (RequestContextHolder.getRequestAttributes()
                instanceof ServletRequestAttributes attributes)
            return ClientKind.fromHeader(attributes.getRequest().getHeader(ClientKind.HEADER));
        return ClientKind.WEB;
    }

    public static boolean isExpired(RefreshToken token) {
        return Instant.now().isAfter(token.getExpiryDate());
    }

    public static boolean isValid(RefreshToken token) {
        return !token.isRevoked() && !isExpired(token);
    }

    public static void revoke(RefreshToken token) {
        token.setRevoked(true);
    }

    @Override
    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token == null) {
            throw SystemException.unauthorized("Refresh token does not exist");
        }
        if (!isValid(token)) {
            refreshTokenRepository.delete(token);
            throw SystemException.unauthorized(
                    "Refresh token is expired or revoked. Please log in again.");
        }
        return token;
    }

    @Override
    public void revokeToken(String token) {
        if (token != null && !token.isBlank()) {
            findByTokenForUpdate(token)
                    .ifPresent(
                            rt -> {
                                revoke(rt);
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
