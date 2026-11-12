package com.uav.platform.dto.record.auth;

/** A freshly issued OTP challenge; devOtpPreview is only filled when mail delivery is disabled in development. */
public record IssuedChallenge(String challengeToken, String devOtpPreview) {}
