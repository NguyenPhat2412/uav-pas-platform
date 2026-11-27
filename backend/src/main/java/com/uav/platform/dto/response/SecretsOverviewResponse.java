package com.uav.platform.dto.response;

import java.util.List;

/** Secret health overview. Secrets are rotated on the server, never through the web UI. */
public record SecretsOverviewResponse(
        List<SecretStatusResponse> secrets,
        AiProviderKeyStatusResponse aiProviderKey,
        List<SecurityWarningResponse> warnings) {}
