package com.uav.platform.dto.record.auth;

/**
 * Claims of an Apple ID token that passed RS256 JWKS signature verification, expiry, issuer,
 * audience, subject, and optional nonce/email checks. {@code email} is lower-cased when present or
 * {@code null} when Apple omits it on subsequent sign-ins.
 */
public record AppleIdentity(String sub, String email, boolean emailVerified) {}
