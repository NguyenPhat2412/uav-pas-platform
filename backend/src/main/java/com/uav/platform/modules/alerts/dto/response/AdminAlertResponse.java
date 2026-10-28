package com.uav.platform.modules.alerts.dto.response;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * One current issue. messageKey is an i18n catalog key (adminPlatform namespace) rendered with
 * params; href is an admin portal path. since is when the condition started, when known.
 */
public record AdminAlertResponse(
        String id,
        String code,
        String severity,
        String source,
        String messageKey,
        Map<String, Object> params,
        String href,
        LocalDateTime since) {}
