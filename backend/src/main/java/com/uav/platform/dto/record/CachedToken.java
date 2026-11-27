package com.uav.platform.dto.record;

import java.time.Instant;

public record CachedToken(String token, Instant expiresAt) {}
