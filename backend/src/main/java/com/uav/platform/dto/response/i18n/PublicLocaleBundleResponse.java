package com.uav.platform.dto.response.i18n;

import java.util.List;
import java.util.Map;

public record PublicLocaleBundleResponse(
        String locale,
        List<String> supportedLocales,
        int totalKeys,
        long revision,
        /** Nested JSON tree matching frontend MessageRecord shape (e.g. messages.publicSite.hero.title). */
        Map<String, Object> messages,
        /** Flat dot-key map for O(1) overrides. */
        Map<String, String> flat) {}
