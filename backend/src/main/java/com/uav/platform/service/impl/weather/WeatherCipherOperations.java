package com.uav.platform.service.impl.weather;

import com.uav.platform.common.util.AesGcmCipher;
import com.uav.platform.common.util.Hashing;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.GeneralSecurityException;

/**
 * AES-256-GCM for the weather provider API key, keyed by SHA-256 of the configured secret. Stored text is
 * Base64(IV || ciphertext+tag).
 */
@Component
public class WeatherCipherOperations {
    private final AesGcmCipher cipher;

    public WeatherCipherOperations(
            @Value("${app.weather.encryption-secret:${app.jwt.secret}}") String secret) {
        if (secret == null || secret.isBlank())
            throw new IllegalStateException("WEATHER_ENCRYPTION_SECRET_MISSING");
        this.cipher = new AesGcmCipher(Hashing.sha256(secret));
    }

    public String encrypt(String plain) {
        try {
            return cipher.encrypt(plain);
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("WEATHER_KEY_ENCRYPTION_FAILED", ex);
        }
    }

    /** Throws {@link IllegalStateException} when the text was altered or sealed with another key. */
    public String decrypt(String stored) {
        try {
            return cipher.decrypt(stored);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new IllegalStateException("WEATHER_KEY_DECRYPTION_FAILED", ex);
        }
    }
}
