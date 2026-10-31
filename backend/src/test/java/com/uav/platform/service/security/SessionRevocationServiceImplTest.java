package com.uav.platform.service.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.entity.security.SessionRevocation;
import com.uav.platform.repository.security.SessionRevocationRepository;
import com.uav.platform.service.impl.security.SessionRevocationServiceImpl;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

class SessionRevocationServiceImplTest {

    private final SessionRevocationRepository repository = mock(SessionRevocationRepository.class);
    private final Instant now = Instant.parse("2026-10-25T10:15:30.750Z");
    private final SessionRevocationServiceImpl service =
            new SessionRevocationServiceImpl(repository, Clock.fixed(now, ZoneOffset.UTC));

    private SessionRevocation row(Instant cutoff) {
        var r = new SessionRevocation();
        r.setUserId(5L);
        r.setRevokedBefore(cutoff);
        return r;
    }

    @Test
    void tokensIssuedAtOrBeforeCutoffAreRevoked() {
        Instant cutoff = Instant.parse("2026-10-25T10:15:30Z");
        when(repository.findById(5L)).thenReturn(Optional.of(row(cutoff)));

        assertTrue(service.isRevoked(5L, cutoff.minusSeconds(60)));
        assertTrue(service.isRevoked(5L, cutoff), "same-second token fails closed");
        assertTrue(service.isRevoked(5L, null), "token without iat cannot prove it is newer");
        assertFalse(service.isRevoked(5L, cutoff.plusSeconds(1)));
    }

    @Test
    void usersWithoutRevocationAreNotRevoked() {
        when(repository.findById(9L)).thenReturn(Optional.empty());
        assertFalse(service.isRevoked(9L, Instant.EPOCH));
        assertFalse(service.isRevoked(null, Instant.EPOCH));
    }

    @Test
    @SuppressWarnings("unchecked")
    void revokeUpsertsCutoffTruncatedToSeconds() {
        var existing = row(Instant.EPOCH);
        when(repository.findAllById(List.of(5L, 6L))).thenReturn(List.of(existing));

        Instant cutoff = service.revokeAccessTokens(List.of(5L, 6L), "admin");

        assertEquals(Instant.parse("2026-10-25T10:15:30Z"), cutoff);
        ArgumentCaptor<List<SessionRevocation>> saved = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(saved.capture());
        assertEquals(2, saved.getValue().size());
        assertSame(existing, saved.getValue().get(0));
        for (SessionRevocation r : saved.getValue()) {
            assertEquals(cutoff, r.getRevokedBefore());
            assertEquals("admin", r.getRevokedBy());
        }
        assertEquals(6L, saved.getValue().get(1).getUserId());
    }

    @Test
    void revokingNobodyWritesNothing() {
        service.revokeAccessTokens(List.of(), "admin");
        verify(repository, never()).saveAll(any());
    }
}
