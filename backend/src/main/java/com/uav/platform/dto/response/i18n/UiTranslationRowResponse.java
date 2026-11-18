package com.uav.platform.dto.response.i18n;

import java.time.LocalDateTime;

public record UiTranslationRowResponse(
        Long id,
        String namespace,
        String translationKey,
        String description,
        String vi,
        String en,
        String ja,
        String updatedBy,
        LocalDateTime updatedAt) {}
