package com.uav.platform.common.util;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/** SHA-256 and HMAC-SHA256 over UTF-8 text, the way every service hashes keys, tokens and payloads. */
public final class Hashing {
    private static final String SHA_256 = "SHA-256";
    private static final String HMAC_SHA_256 = "HmacSHA256";

    private Hashing() {}

    public static byte[] sha256(byte[] input) {
        try {
            return MessageDigest.getInstance(SHA_256).digest(input);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    public static byte[] sha256(String input) {
        return sha256(input.getBytes(StandardCharsets.UTF_8));
    }

    /** Lower-case hex, 64 characters. */
    public static String sha256Hex(String input) {
        return HexFormat.of().formatHex(sha256(input));
    }

    /** Lower-case hex HMAC-SHA256 of {@code data} keyed by {@code key}. */
    public static String hmacSha256Hex(String key, String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA_256);
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), HMAC_SHA_256));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", e);
        }
    }

    /** Constant-time comparison of two strings' UTF-8 bytes; false when either is null. */
    public static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }
}
