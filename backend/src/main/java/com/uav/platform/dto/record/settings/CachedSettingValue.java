package com.uav.platform.dto.record.settings;

public record CachedSettingValue(String value, long expiresAtNanos) {}
