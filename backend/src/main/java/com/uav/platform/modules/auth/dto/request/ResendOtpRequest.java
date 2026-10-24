package com.uav.platform.modules.auth.dto.request;

public record ResendOtpRequest(String challengeToken, String email, String purpose) {}
