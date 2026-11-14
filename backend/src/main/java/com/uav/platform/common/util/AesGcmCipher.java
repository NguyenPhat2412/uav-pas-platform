package com.uav.platform.common.util;

import static com.uav.platform.common.constant.CryptoConstants.AES_GCM_IV_BYTES;
import static com.uav.platform.common.constant.CryptoConstants.AES_GCM_TAG_BITS;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * AES-256-GCM for secrets stored in the database. Stored text is Base64(IV || ciphertext+tag) with a
 * fresh 12-byte IV and a 128-bit tag; callers derive the 32-byte key and map failures to their own errors.
 */
public final class AesGcmCipher {
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";

    private final SecretKeySpec key;

    public AesGcmCipher(byte[] key256) {
        this.key = new SecretKeySpec(key256, "AES");
    }

    public String encrypt(String plain) throws GeneralSecurityException {
        byte[] iv = SecureTokens.randomBytes(AES_GCM_IV_BYTES);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(AES_GCM_TAG_BITS, iv));
        byte[] sealed = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
        byte[] out = new byte[iv.length + sealed.length];
        System.arraycopy(iv, 0, out, 0, iv.length);
        System.arraycopy(sealed, 0, out, iv.length, sealed.length);
        return Base64.getEncoder().encodeToString(out);
    }

    /**
     * @throws GeneralSecurityException when the text was altered or sealed with another key
     * @throws IllegalArgumentException when the text is not base64 or too short to hold an IV
     */
    public String decrypt(String stored) throws GeneralSecurityException {
        byte[] data = Base64.getDecoder().decode(stored);
        if (data.length <= AES_GCM_IV_BYTES)
            throw new IllegalArgumentException("ciphertext too short");
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(
                Cipher.DECRYPT_MODE,
                key,
                new GCMParameterSpec(AES_GCM_TAG_BITS, data, 0, AES_GCM_IV_BYTES));
        return new String(
                cipher.doFinal(data, AES_GCM_IV_BYTES, data.length - AES_GCM_IV_BYTES),
                StandardCharsets.UTF_8);
    }
}
