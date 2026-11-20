package com.uav.platform.dto.request.i18n;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record UpsertUiTranslationRequest(
        @NotBlank @Size(max = 180) String translationKey,
        @Size(max = 60) String namespace,
        @Size(max = 255) String description,
        /** Map of locale code ("vi", "en", "ja") -> message text to upsert in one atomic call. */
        Map<String, String> translations) {}
