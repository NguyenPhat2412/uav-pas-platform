package com.uav.platform.dto.response.media;

import com.uav.platform.enums.media.*;

public record SignedMediaUrlResponse(
        Long mediaId, String url, String operation, long expiresInSeconds) {}
