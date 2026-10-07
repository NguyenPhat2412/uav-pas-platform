package com.uav.platform.modules.user.service.impl;


import com.uav.platform.modules.user.common.*;

import com.uav.platform.modules.user.entity.InvalidatedToken;
import com.uav.platform.modules.user.repository.InvalidatedTokenRepository;
import com.uav.platform.modules.user.service.InvalidatedTokenService;
import com.uav.platform.security.jwt.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Date;

@Service
@Transactional
public class IInvalidatedTokenService implements InvalidatedTokenService {

    private static final Logger log = LoggerFactory.getLogger(IInvalidatedTokenService.class);

    private final InvalidatedTokenRepository invalidatedTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;

    public IInvalidatedTokenService(
            InvalidatedTokenRepository invalidatedTokenRepository,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.invalidatedTokenRepository = invalidatedTokenRepository;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    public void invalidate(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        try {
            String tokenId = jwtTokenProvider.getTokenIdFromToken(token);
            Date expiration = jwtTokenProvider.getExpirationFromToken(token);
            Instant expiryInstant = expiration != null ? expiration.toInstant() : Instant.now().plusSeconds(86400);

            if (!invalidatedTokenRepository.existsByTokenId(tokenId)) {
                invalidatedTokenRepository.save(new InvalidatedToken(tokenId, expiryInstant));
                log.info("Token successfully invalidated: {}", tokenId);
            }
        } catch (Exception e) {
            log.warn("Failed to invalidate token: {}", e.getMessage());
        }
    }

    @Override
    public void invalidate(String tokenId, Instant expiryTime) {
        if (tokenId == null || tokenId.isBlank()) return;
        if (!invalidatedTokenRepository.existsByTokenId(tokenId)) {
            invalidatedTokenRepository.save(new InvalidatedToken(tokenId, expiryTime));
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isInvalidated(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            String tokenId = jwtTokenProvider.getTokenIdFromToken(token);
            return invalidatedTokenRepository.existsByTokenId(tokenId);
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    @Scheduled(cron = "0 0 * * * *") // Runs every hour
    public void purgeExpiredTokens() {
        int deleted = invalidatedTokenRepository.deleteExpiredTokens(Instant.now());
        if (deleted > 0) {
            log.info("Purged {} expired invalidated tokens", deleted);
        }
    }
}
