package com.uav.platform.dto.request;

public record TwoFactorDisableRequest(String password, String code) {}
