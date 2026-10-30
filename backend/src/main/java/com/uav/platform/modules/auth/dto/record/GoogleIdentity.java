package com.uav.platform.modules.auth.dto.record;

/**
 * Claims of a Google ID token that passed every check: signature and expiry (by Google), audience,
 * issuer and a verified email. The email is trimmed and lower-cased; name may be null.
 */
public record GoogleIdentity(String subject, String email, String name) {}
