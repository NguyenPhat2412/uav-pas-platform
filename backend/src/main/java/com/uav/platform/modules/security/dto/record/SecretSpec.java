package com.uav.platform.modules.security.dto.record;

/** Definition of one monitored secret: property, env var, minimum length and rotation guide key. */
public record SecretSpec(String property, String envVar, int minLength, String rotationKey) {}
