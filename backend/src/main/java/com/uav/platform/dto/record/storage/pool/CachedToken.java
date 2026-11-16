package com.uav.platform.dto.record.storage.pool;

import java.time.Instant;

public record CachedToken(String token, Instant expiresAt) {}
