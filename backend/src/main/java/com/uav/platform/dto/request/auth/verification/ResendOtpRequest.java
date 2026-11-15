package com.uav.platform.dto.request.auth.verification;

public record ResendOtpRequest(String challengeToken, String email, String purpose) {}
