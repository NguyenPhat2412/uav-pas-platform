package com.uav.platform.dto.request.auth.verification;

public record TwoFactorDisableRequest(String password, String code) {}
