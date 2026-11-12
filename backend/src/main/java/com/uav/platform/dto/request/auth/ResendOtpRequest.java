package com.uav.platform.dto.request.auth;

public record ResendOtpRequest(String challengeToken, String email, String purpose) {}
