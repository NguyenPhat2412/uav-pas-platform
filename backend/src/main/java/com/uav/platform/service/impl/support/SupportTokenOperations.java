package com.uav.platform.service.impl.support;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.function.Predicate;

/** Cryptographic visitor token and unique thread code generators for public support threads. */
public final class SupportTokenOperations {

    private static final int VISITOR_TOKEN_BYTES = 24;
    private static final String CODE_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private SupportTokenOperations() {}

    public static String generateThreadCode(LocalDate date) {
        StringBuilder suffix = new StringBuilder(4);
        for (int i = 0; i < 4; i++) {
            suffix.append(CODE_ALPHABET.charAt(SECURE_RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return "SUP-" + date.format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + suffix;
    }

    public static String generateVisitorToken() {
        byte[] randomBytes = new byte[VISITOR_TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(randomBytes);
        return HexFormat.of().formatHex(randomBytes);
    }

    public static String nextUniqueCode(LocalDate date, Predicate<String> exists) {
        for (int attempt = 0; attempt < 16; attempt++) {
            String candidate = generateThreadCode(date);
            if (!exists.test(candidate)) {
                return candidate;
            }
        }
        return generateThreadCode(date);
    }

    public static String nextUniqueVisitorToken(Predicate<String> exists) {
        for (int attempt = 0; attempt < 8; attempt++) {
            String candidate = generateVisitorToken();
            if (!exists.test(candidate)) {
                return candidate;
            }
        }
        return generateVisitorToken();
    }
}
