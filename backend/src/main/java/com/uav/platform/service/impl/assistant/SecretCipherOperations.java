package com.uav.platform.service.impl.assistant;

import com.uav.platform.common.util.AesGcmCipher;
import com.uav.platform.common.util.Hashing;

import java.security.GeneralSecurityException;

/** AES-256-GCM for AI router secrets at rest; output is base64(iv || ciphertext+tag). */
public final class SecretCipherOperations {
    private final AesGcmCipher cipher;

    /** The key material is hashed to 256 bits so any non-empty secret string works. */
    public SecretCipherOperations(String keyMaterial) {
        if (keyMaterial == null || keyMaterial.isBlank())
            throw new IllegalStateException("Secret key material is required");
        this.cipher = new AesGcmCipher(Hashing.sha256("uav-pas/ai-router/" + keyMaterial));
    }

    public String encrypt(String plain) {
        try {
            return cipher.encrypt(plain);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    public String decrypt(String encoded) {
        try {
            return cipher.decrypt(encoded);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("Decryption failed", e);
        }
    }
}
