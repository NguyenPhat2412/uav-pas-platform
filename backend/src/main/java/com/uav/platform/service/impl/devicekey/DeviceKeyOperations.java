package com.uav.platform.service.impl.devicekey;

import com.uav.platform.common.util.Hashing;
import com.uav.platform.common.util.SecureTokens;
import com.uav.platform.entity.devicekey.DeviceApiKey;
import com.uav.platform.enums.devicekey.DeviceKeyStatus;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;

/** Key material rules: generation, hashing and constant-time comparison. */
public final class DeviceKeyOperations {
    public static final String KEY_PREFIX = "uavk_";

    /** 32 random bytes, base64url without padding. */
    static final int RANDOM_BYTES = 32;

    static final int ENCODED_LENGTH = 43;
    static final int VISIBLE_PREFIX = 8;

    private DeviceKeyOperations() {}

    public static String generate() {
        return KEY_PREFIX + SecureTokens.base64Url(RANDOM_BYTES);
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
        return Hashing.sha256Hex(key);
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
