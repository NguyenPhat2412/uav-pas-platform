package com.uav.platform.modules.media.config.response;

import com.uav.platform.modules.media.common.*;

public record SignedMediaUrlResponse(Long mediaId, String url, String operation, long expiresInSeconds) { }
