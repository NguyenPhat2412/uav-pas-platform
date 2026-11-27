package com.uav.platform.service.impl;

import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Predicate;

public final class MarketplaceSlugOperations {

    private MarketplaceSlugOperations() {}

    public static String slugify(String raw, String fallbackPrefix) {
        if (raw == null || raw.isBlank()) {
            return fallbackPrefix + "-" + System.currentTimeMillis();
        }
        String normalized =
                Normalizer.normalize(raw.trim(), Normalizer.Form.NFD)
                        .replaceAll("\\p{M}+", "")
                        .replace('đ', 'd')
                        .replace('Đ', 'D')
                        .toLowerCase(Locale.ROOT)
                        .replaceAll("[^a-z0-9]+", "-")
                        .replaceAll("^-+|-+$", "");
        if (normalized.isEmpty()) {
            return fallbackPrefix + "-" + System.currentTimeMillis();
        }
        return normalized.length() > 120 ? normalized.substring(0, 120) : normalized;
    }

    public static String uniqueSlug(
            String raw, String fallbackPrefix, Predicate<String> existsCheck) {
        String base = slugify(raw, fallbackPrefix);
        if (!existsCheck.test(base)) return base;
        int suffix = 2;
        while (existsCheck.test(base + "-" + suffix)) {
            suffix++;
        }
        return base + "-" + suffix;
    }
}
