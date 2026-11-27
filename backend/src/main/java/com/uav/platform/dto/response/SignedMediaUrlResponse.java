package com.uav.platform.dto.response;

import com.uav.platform.enums.*;

public record SignedMediaUrlResponse(
        Long mediaId, String url, String operation, long expiresInSeconds) {}
