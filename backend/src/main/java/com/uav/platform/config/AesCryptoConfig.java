package com.uav.platform.config;

import com.uav.platform.common.util.AesCryptoRegistry;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Initializes the shared AES-256-GCM encryption registry from {@code app.crypto.aes-secret}
 * (falling back to {@code app.jwt.secret}) for user PII converters and document encryption.
 */
@Configuration
public class AesCryptoConfig {

    public AesCryptoConfig(
            @Value("${app.crypto.aes-secret:}") String aesSecret,
            @Value("${app.jwt.secret:}") String jwtSecret) {
        String effective = (aesSecret != null && !aesSecret.isBlank()) ? aesSecret : jwtSecret;
        AesCryptoRegistry.configure(effective);
    }
}
