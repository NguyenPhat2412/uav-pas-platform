package com.uav.platform.modules.media.dto.response;

import com.uav.platform.modules.media.enums.*;

public record SignedMediaUrlResponse(
        Long mediaId, String url, String operation, long expiresInSeconds) {}
