package com.uav.platform.service.impl.infrastructure;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.dto.record.infrastructure.TlsCertificateInfo;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

class TlsCertificateServiceImplTest {
    private static final Instant NOW = Instant.parse("2026-10-25T00:00:00Z");

    @Test
    void daysLeftRoundsDownAndGoesNegativeAfterExpiry() {
        assertEquals(30, TlsCertificateServiceImpl.daysLeft(NOW.plus(Duration.ofDays(30)), NOW));
        assertEquals(
                13,
                TlsCertificateServiceImpl.daysLeft(
                        NOW.plus(Duration.ofDays(14)).minusSeconds(1), NOW));
        assertEquals(0, TlsCertificateServiceImpl.daysLeft(NOW.plusSeconds(3600), NOW));
        assertEquals(-1, TlsCertificateServiceImpl.daysLeft(NOW.minusSeconds(1), NOW));
    }

    @Test
    void classifiesExpiryWindow() {
        assertEquals("OK", TlsCertificateServiceImpl.classify(NOW.plus(Duration.ofDays(14)), NOW));
        assertEquals(
                "EXPIRING", TlsCertificateServiceImpl.classify(NOW.plus(Duration.ofDays(13)), NOW));
        assertEquals("EXPIRED", TlsCertificateServiceImpl.classify(NOW, NOW));
        assertEquals("EXPIRED", TlsCertificateServiceImpl.classify(NOW.minusSeconds(5), NOW));
    }

    @Test
    void issuerCommonNameFallsBackToOrganization() {
        assertEquals("R11", TlsCertificateServiceImpl.commonName("CN=R11,O=Let's Encrypt,C=US"));
        assertEquals(
                "Google Trust Services",
                TlsCertificateServiceImpl.commonName("O=Google Trust Services,C=US"));
        assertNull(TlsCertificateServiceImpl.commonName("not a dn"));
    }

    @Test
    void nonHttpsOrMissingUrlNeverConnects() {
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
        TlsCertificateInfo http =
                new TlsCertificateServiceImpl("http://localhost:3000", clock).current();
        assertEquals("NOT_HTTPS", http.status());
        assertNull(http.notAfter());
        assertEquals("NOT_CONFIGURED", new TlsCertificateServiceImpl("", clock).current().status());
    }
}
