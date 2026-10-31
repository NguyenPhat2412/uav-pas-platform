package com.uav.platform.service.impl.auth;

import com.uav.platform.entity.auth.InvalidatedToken;
import com.uav.platform.repository.auth.InvalidatedTokenRepository;
import com.uav.platform.security.jwt.JwtTokenProvider;
import com.uav.platform.service.auth.InvalidatedTokenService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Date;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class InvalidatedTokenServiceImpl implements InvalidatedTokenService {

    private final InvalidatedTokenRepository invalidatedTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public void invalidate(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        try {
            String tokenId = jwtTokenProvider.getTokenIdFromToken(token);
            Date expiration = jwtTokenProvider.getExpirationFromToken(token);
            Instant expiryInstant =
                    expiration != null ? expiration.toInstant() : Instant.now().plusSeconds(86400);

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
