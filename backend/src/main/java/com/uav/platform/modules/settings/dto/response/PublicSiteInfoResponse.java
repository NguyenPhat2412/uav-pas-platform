package com.uav.platform.modules.settings.dto.response;

import java.util.Map;

/**
 * Unauthenticated site information: only settings flagged is_public. Blank values are omitted so
 * clients fall back to their own defaults.
 */
public record PublicSiteInfoResponse(
        String dispatchHotline, String email, String address, Map<String, String> settings) {}
