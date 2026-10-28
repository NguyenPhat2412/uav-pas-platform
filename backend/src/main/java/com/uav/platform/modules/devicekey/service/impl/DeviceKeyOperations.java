package com.uav.platform.modules.devicekey.service.impl;

import com.uav.platform.modules.devicekey.entity.DeviceApiKey;
import com.uav.platform.modules.devicekey.enums.DeviceKeyStatus;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

/** Key material rules: generation, hashing and constant-time comparison. */
public final class DeviceKeyOperations {
    public static final String KEY_PREFIX = "uavk_";

    /** 32 random bytes, base64url without padding. */
    static final int RANDOM_BYTES = 32;

    static final int ENCODED_LENGTH = 43;
    static final int VISIBLE_PREFIX = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private DeviceKeyOperations() {}

    public static String generate() {
        byte[] bytes = new byte[RANDOM_BYTES];
        RANDOM.nextBytes(bytes);
        return KEY_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** Cheap shape check so malformed headers never reach the database. */
    public static boolean wellFormed(String key) {
        if (key == null || key.length() != KEY_PREFIX.length() + ENCODED_LENGTH) return false;
        if (!key.startsWith(KEY_PREFIX)) return false;
        for (int i = KEY_PREFIX.length(); i < key.length(); i++) {
            char c = key.charAt(i);
            if (!(Character.isLetterOrDigit(c) && c < 128) && c != '-' && c != '_') return false;
        }
        return true;
    }

    /** Non-secret fragment shown in the list: the first characters after "uavk_". */
    public static String visiblePrefix(String key) {
        return key.substring(KEY_PREFIX.length(), KEY_PREFIX.length() + VISIBLE_PREFIX);
    }

    public static String sha256Hex(String key) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(key.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    public static boolean hashesEqual(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.US_ASCII), b.getBytes(StandardCharsets.US_ASCII));
    }

    public static DeviceKeyStatus status(DeviceApiKey key, LocalDateTime now) {
        if (key.getRevokedAt() != null) return DeviceKeyStatus.REVOKED;
        if (key.getExpiresAt() != null && !key.getExpiresAt().isAfter(now))
            return DeviceKeyStatus.EXPIRED;
        return DeviceKeyStatus.ACTIVE;
    }

    static DeviceApiKey create(
            String name,
            Long uavId,
            String keyPrefix,
            String keyHash,
            String scopes,
            String createdBy,
            LocalDateTime createdAt,
            LocalDateTime expiresAt) {
        DeviceApiKey k = new DeviceApiKey();
        k.setName(name);
        k.setUavId(uavId);
        k.setKeyPrefix(keyPrefix);
        k.setKeyHash(keyHash);
        k.setScopes(scopes);
        k.setCreatedBy(createdBy);
        k.setCreatedAt(createdAt);
        k.setExpiresAt(expiresAt);
        return k;
    }
}
