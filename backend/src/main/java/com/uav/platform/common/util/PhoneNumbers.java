package com.uav.platform.common.util;

import java.util.regex.Pattern;

/** Vietnamese phone numbers, stored one way everywhere so uniqueness checks compare like with like. */
public final class PhoneNumbers {
    /** A leading 0 and 9 or 10 more digits (mobile and landline). */
    private static final Pattern VIETNAM = Pattern.compile("^0\\d{9,10}$");

    private PhoneNumbers() {}

    /** Strips spaces, dots, dashes and brackets and turns +84/84 into 0; null when it is not a Vietnamese number. */
    public static String normalizeVietnam(String raw) {
        if (raw == null) return null;
        String digits = raw.trim().replaceAll("[\\s.()\\-]", "");
        if (digits.startsWith("+84")) digits = "0" + digits.substring(3);
        else if (digits.startsWith("84") && digits.length() >= 11)
            digits = "0" + digits.substring(2);
        return VIETNAM.matcher(digits).matches() ? digits : null;
    }
}
