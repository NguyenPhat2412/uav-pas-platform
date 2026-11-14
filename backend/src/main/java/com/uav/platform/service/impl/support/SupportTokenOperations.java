package com.uav.platform.service.impl.support;

import com.uav.platform.common.util.SecureTokens;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.function.Predicate;

/** Cryptographic visitor token and unique thread code generators for public support threads. */
public final class SupportTokenOperations {

    private static final int VISITOR_TOKEN_BYTES = 24;
    private static final String CODE_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    private SupportTokenOperations() {}

    public static String generateThreadCode(LocalDate date) {
        return "SUP-"
                + date.format(DateTimeFormatter.BASIC_ISO_DATE)
                + "-"
                + SecureTokens.fromAlphabet(CODE_ALPHABET, 4);
    }

    public static String generateVisitorToken() {
        return SecureTokens.hex(VISITOR_TOKEN_BYTES);
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
