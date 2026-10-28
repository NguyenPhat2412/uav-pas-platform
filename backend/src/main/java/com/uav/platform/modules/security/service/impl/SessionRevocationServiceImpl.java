package com.uav.platform.modules.security.service.impl;

import com.uav.platform.modules.security.entity.SessionRevocation;
import com.uav.platform.modules.security.repository.SessionRevocationRepository;
import com.uav.platform.modules.security.service.SessionRevocationService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class SessionRevocationServiceImpl implements SessionRevocationService {

    private final SessionRevocationRepository repository;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public SessionRevocationServiceImpl(SessionRevocationRepository repository) {
        this(repository, Clock.systemUTC());
    }

    /**
     * JWT "iat" has whole-second precision, so the cut-off is the current second and a token
     * issued in that same second counts as revoked (fail closed; a re-login simply retries).
     */
    static Instant cutoff(Clock clock) {
        return Instant.now(clock).truncatedTo(ChronoUnit.SECONDS);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isRevoked(Long userId, Instant issuedAt) {
        if (userId == null) return false;
        return repository
                .findById(userId)
                .map(r -> issuedAt == null || !issuedAt.isAfter(r.getRevokedBefore()))
                .orElse(false);
    }

    @Override
    public Instant revokeAccessTokens(Collection<Long> userIds, String actor) {
        Instant cutoff = cutoff(clock);
        if (userIds == null || userIds.isEmpty()) return cutoff;
        Map<Long, SessionRevocation> existing =
                repository.findAllById(userIds).stream()
                        .collect(
                                Collectors.toMap(
                                        SessionRevocation::getUserId, Function.identity()));
        List<SessionRevocation> rows = new ArrayList<>(userIds.size());
        for (Long id : userIds) {
            if (id == null) continue;
            SessionRevocation row = existing.get(id);
            if (row == null) {
                row = new SessionRevocation();
                row.setUserId(id);
            }
            row.setRevokedBefore(cutoff);
            row.setRevokedBy(actor);
            row.setUpdatedAt(Instant.now(clock));
            rows.add(row);
        }
        repository.saveAll(rows);
        return cutoff;
    }
}
