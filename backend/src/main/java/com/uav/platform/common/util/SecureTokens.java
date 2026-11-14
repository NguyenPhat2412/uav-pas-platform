package com.uav.platform.common.util;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/** Unguessable tokens (visitor tokens, device keys, webhook secrets) from one shared SecureRandom. */
public final class SecureTokens {
    private static final SecureRandom RANDOM = new SecureRandom();

    private SecureTokens() {}

    public static byte[] randomBytes(int length) {
        byte[] bytes = new byte[length];
        RANDOM.nextBytes(bytes);
        return bytes;
    }

    /** {@code byteLength} random bytes as lower-case hex (2 characters per byte). */
    public static String hex(int byteLength) {
        return HexFormat.of().formatHex(randomBytes(byteLength));
    }

    /** {@code byteLength} random bytes as URL-safe base64 without padding. */
    public static String base64Url(int byteLength) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes(byteLength));
    }

    /** {@code length} characters drawn uniformly from {@code alphabet}. */
    public static String fromAlphabet(String alphabet, int length) {
        StringBuilder out = new StringBuilder(length);
        for (int i = 0; i < length; i++)
            out.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        return out.toString();
    }
}
