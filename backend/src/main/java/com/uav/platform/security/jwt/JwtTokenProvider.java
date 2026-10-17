package com.uav.platform.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);
    private static final long DEFAULT_EXPIRATION_MS = 86400000L; // 24 hours
    private static final long DEFAULT_REFRESH_EXPIRATION_MS = 604800000L; // 7 days

    private final SecretKey key;
    private final long expirationMs;
    private final long refreshExpirationMs;

    @org.springframework.beans.factory.annotation.Autowired
    public JwtTokenProvider(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms:" + DEFAULT_EXPIRATION_MS + "}") long expirationMs,
            @Value("${app.jwt.refresh-expiration-ms:" + DEFAULT_REFRESH_EXPIRATION_MS + "}")
                    long refreshExpirationMs) {
        this.expirationMs = expirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
        if (secret == null || secret.isBlank())
            throw new IllegalStateException("APP_JWT_SECRET must be configured");
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);

        if (keyBytes.length < 32) {
            try {
                MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
                keyBytes = sha256.digest(keyBytes);
            } catch (NoSuchAlgorithmException e) {
                log.error("SHA-256 algorithm not available", e);
            }
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public JwtTokenProvider(String secret, long expirationMs) {
        this(secret, expirationMs, DEFAULT_REFRESH_EXPIRATION_MS);
    }

    public String generateToken(Long userId, String username, String email) {
        return generateToken(userId, username, email, "ROLE_PILOT", this.expirationMs);
    }

    public String generateToken(Long userId, String username, String email, String role) {
        return generateToken(userId, username, email, role, this.expirationMs);
    }

    public String generateToken(Long userId, String username, String email, long validityMs) {
        return generateToken(userId, username, email, "ROLE_PILOT", validityMs);
    }

    public String generateToken(
            Long userId, String username, String email, String role, long validityMs) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + validityMs);

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(username)
                .claim("userId", userId)
                .claim("email", email)
                .claim("role", role != null ? role : "ROLE_PILOT")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public Claims getClaimsFromToken(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    public String getUsernameFromToken(String token) {
        return getClaimsFromToken(token).getSubject();
    }

    public String getRoleFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        Object roleObj = claims.get("role");
        return roleObj != null ? roleObj.toString() : "ROLE_PILOT";
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        Object userIdObj = claims.get("userId");
        if (userIdObj instanceof Number number) {
            return number.longValue();
        }
        if (userIdObj != null) {
            return Long.parseLong(userIdObj.toString());
        }
        return null;
    }

    public String getTokenIdFromToken(String token) {
        try {
            Claims claims = getClaimsFromToken(token);
            String id = claims.getId();
            if (id != null && !id.isBlank()) {
                return id;
            }
        } catch (Exception ignored) {
        }

        // Fallback: SHA-256 hash of token string
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                hexString.append(String.format("%02x", b));
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            return token;
        }
    }

    public Date getExpirationFromToken(String token) {
        return getClaimsFromToken(token).getExpiration();
    }

    public boolean validateToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    public long getRefreshExpirationMs() {
        return refreshExpirationMs;
    }
}
