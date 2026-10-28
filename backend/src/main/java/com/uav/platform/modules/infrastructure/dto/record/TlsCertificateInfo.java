package com.uav.platform.modules.infrastructure.dto.record;

import java.time.Instant;

/**
 * Certificate served at app.public-url. status is OK, EXPIRING (under 14 days), EXPIRED, NOT_HTTPS, NOT_CONFIGURED
 * or UNREACHABLE. trusted is whether the JDK trust store and hostname check accept the chain; null when no
 * handshake happened. errorClass carries the exception type only, never a message that could name a host.
 */
public record TlsCertificateInfo(
        String status,
        Instant notAfter,
        Long daysLeft,
        String issuer,
        Boolean trusted,
        Instant checkedAt,
        String errorClass) {}
