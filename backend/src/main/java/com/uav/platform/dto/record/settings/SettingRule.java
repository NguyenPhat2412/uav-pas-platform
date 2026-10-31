package com.uav.platform.dto.record.settings;

import com.uav.platform.enums.settings.SettingValueType;

import java.math.BigDecimal;

/** Built-in validation rule for a well-known setting key. */
public record SettingRule(SettingValueType type, BigDecimal min, BigDecimal max, String pattern) {}
