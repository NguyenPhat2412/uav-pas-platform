package com.uav.platform.modules.weather.service.impl;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * AES/GCM/NoPadding for the weather provider API key: a 256-bit key derived with SHA-256 from the
 * configured secret, a fresh random 12-byte IV per encryption and a 128-bit authentication tag.
 * Stored text is Base64(IV || ciphertext+tag).
 */
@Component
public class WeatherCipherOperations {
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public WeatherCipherOperations(
            @Value("${app.weather.encryption-secret:${app.jwt.secret}}") String secret) {
        if (secret == null || secret.isBlank())
            throw new IllegalStateException("WEATHER_ENCRYPTION_SECRET_MISSING");
        this.key = new SecretKeySpec(sha256(secret), "AES");
    }

    public String encrypt(String plain) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] sealed = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder()
                    .encodeToString(
                            ByteBuffer.allocate(iv.length + sealed.length)
                                    .put(iv)
                                    .put(sealed)
                                    .array());
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("WEATHER_KEY_ENCRYPTION_FAILED", ex);
        }
    }

    /** Throws {@link IllegalStateException} when the text was altered or sealed with another key. */
    public String decrypt(String stored) {
        try {
            byte[] data = Base64.getDecoder().decode(stored);
            if (data.length <= IV_BYTES) throw new IllegalStateException("WEATHER_KEY_CORRUPT");
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(
                    Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, data, 0, IV_BYTES));
            byte[] plain = cipher.doFinal(data, IV_BYTES, data.length - IV_BYTES);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new IllegalStateException("WEATHER_KEY_DECRYPTION_FAILED", ex);
        }
    }

    private static byte[] sha256(String secret) {
        try {
            return MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
