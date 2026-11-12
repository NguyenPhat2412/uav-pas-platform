package com.uav.platform.dto.request.auth;

public record TwoFactorDisableRequest(String password, String code) {}
