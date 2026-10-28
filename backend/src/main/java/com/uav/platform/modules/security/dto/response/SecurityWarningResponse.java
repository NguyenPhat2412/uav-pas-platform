package com.uav.platform.modules.security.dto.response;

/**
 * A configuration finding. {@code code} is stable and translated by the UI; {@code severity} is
 * CRITICAL, WARNING or INFO.
 */
public record SecurityWarningResponse(String code, String severity, String subject) {}
