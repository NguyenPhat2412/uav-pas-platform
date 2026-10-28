package com.uav.platform.modules.settings.dto.record;

import com.uav.platform.modules.settings.enums.SettingValueType;

import java.math.BigDecimal;

/** Built-in validation rule for a well-known setting key. */
public record SettingRule(SettingValueType type, BigDecimal min, BigDecimal max, String pattern) {}
