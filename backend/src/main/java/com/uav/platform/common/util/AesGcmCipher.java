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
    public static final String TEXT_PREFIX = "AES256GCM::v1::";
    public static final byte[] BINARY_MAGIC = new byte[] {'U', 'A', 'V', 'A', 'E', 'S', '0', '1'};

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

    public String encryptTagged(String plain) throws GeneralSecurityException {
        if (plain == null || plain.isEmpty() || isEncryptedText(plain)) {
            return plain;
        }
        return TEXT_PREFIX + encrypt(plain);
    }

    public String decryptTagged(String stored) throws GeneralSecurityException {
        if (stored == null || !isEncryptedText(stored)) {
            return stored;
        }
        return decrypt(stored.substring(TEXT_PREFIX.length()));
    }

    public static boolean isEncryptedText(String value) {
        return value != null && value.startsWith(TEXT_PREFIX);
    }

    public byte[] encryptBytes(byte[] plain) throws GeneralSecurityException {
        if (plain == null || isEncryptedBytes(plain)) {
            return plain;
        }
        byte[] iv = SecureTokens.randomBytes(AES_GCM_IV_BYTES);
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(AES_GCM_TAG_BITS, iv));
        byte[] sealed = cipher.doFinal(plain);
        byte[] out = new byte[BINARY_MAGIC.length + iv.length + sealed.length];
        System.arraycopy(BINARY_MAGIC, 0, out, 0, BINARY_MAGIC.length);
        System.arraycopy(iv, 0, out, BINARY_MAGIC.length, iv.length);
        System.arraycopy(sealed, 0, out, BINARY_MAGIC.length + iv.length, sealed.length);
        return out;
    }

    public byte[] decryptBytes(byte[] stored) throws GeneralSecurityException {
        if (stored == null || !isEncryptedBytes(stored)) {
            return stored;
        }
        int headerLen = BINARY_MAGIC.length + AES_GCM_IV_BYTES;
        if (stored.length <= headerLen) {
            throw new IllegalArgumentException("encrypted document payload too short");
        }
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(
                Cipher.DECRYPT_MODE,
                key,
                new GCMParameterSpec(
                        AES_GCM_TAG_BITS, stored, BINARY_MAGIC.length, AES_GCM_IV_BYTES));
        return cipher.doFinal(stored, headerLen, stored.length - headerLen);
    }

    public static boolean isEncryptedBytes(byte[] data) {
        if (data == null || data.length < BINARY_MAGIC.length) {
            return false;
        }
        for (int i = 0; i < BINARY_MAGIC.length; i++) {
            if (data[i] != BINARY_MAGIC[i]) {
                return false;
            }
        }
        return true;
    }
}
