package com.uav.platform.dto.request;

public record ResendOtpRequest(String challengeToken, String email, String purpose) {}
