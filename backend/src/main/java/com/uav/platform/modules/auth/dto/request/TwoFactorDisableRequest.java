package com.uav.platform.modules.auth.dto.request;

public record TwoFactorDisableRequest(String password, String code) {}
