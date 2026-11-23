package com.uav.platform.common.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Holds the process-wide AES-256-GCM cipher configured from Spring properties so Hibernate
 * {@code @Converter} instances and document storage components share one consistent encryption key.
 */
public final class AesCryptoRegistry {

    private static final String DEFAULT_DEV_FALLBACK_KEY =
            "uav-pas-default-aes-256-gcm-key-configure-in-production";

    private static volatile AesGcmCipher current =
            new AesGcmCipher(deriveKey256(DEFAULT_DEV_FALLBACK_KEY));

    private AesCryptoRegistry() {}

    public static void configure(String rawSecret) {
        String effective =
                (rawSecret == null || rawSecret.isBlank()) ? DEFAULT_DEV_FALLBACK_KEY : rawSecret;
        current = new AesGcmCipher(deriveKey256(effective));
    }

    public static AesGcmCipher currentCipher() {
        return current;
    }

    public static byte[] deriveKey256(String secret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return digest.digest(secret.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", ex);
        }
    }
}
